-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create tables
create table if not exists public.profiles (
    id uuid references auth.users(id) primary key,
    username text unique not null,
    game_id text,
    avatar_url text,
    wallet_balance decimal(10,2) default 0.00,
    rating integer default 1000,
    is_online boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint username_length check (char_length(username) >= 3)
);

create table if not exists public.tournaments (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    game_type text not null,
    entry_fee decimal(10,2) not null,
    prize_pool decimal(10,2) not null,
    max_participants integer not null,
    current_participants integer default 0,
    bracket_type text default 'single_elimination',
    status text default 'open',
    start_time timestamp with time zone not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    creator_id uuid references public.profiles(id),
    constraint valid_bracket_type check (bracket_type in ('single_elimination', 'double_elimination')),
    constraint valid_status check (status in ('open', 'in_progress', 'completed'))
);

create table if not exists public.tournament_participants (
    id uuid default uuid_generate_v4() primary key,
    tournament_id uuid references public.tournaments(id),
    player_id uuid references public.profiles(id),
    joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(tournament_id, player_id)
);

create table if not exists public.matches (
    id uuid default uuid_generate_v4() primary key,
    tournament_id uuid references public.tournaments(id),
    round integer not null,
    match_order integer not null,
    player1_id uuid references public.profiles(id),
    player2_id uuid references public.profiles(id),
    player1_score integer,
    player2_score integer,
    winner_id uuid references public.profiles(id),
    status text default 'scheduled',
    scheduled_time timestamp with time zone not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint valid_match_status check (status in ('scheduled', 'in_progress', 'completed', 'disputed'))
);

create table if not exists public.transactions (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id),
    amount decimal(10,2) not null,
    type text not null,
    status text default 'pending',
    reference_id uuid,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint valid_transaction_type check (type in ('deposit', 'withdrawal', 'entry_fee', 'prize')),
    constraint valid_transaction_status check (status in ('pending', 'completed', 'failed'))
);

create table if not exists public.chat_messages (
    id uuid default uuid_generate_v4() primary key,
    match_id uuid references public.matches(id),
    user_id uuid references public.profiles(id),
    message text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.notifications (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id),
    title text not null,
    message text not null,
    type text not null,
    read boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint valid_notification_type check (type in ('match_invite', 'tournament_start', 'match_result', 'prize_won'))
);

-- Create indexes
create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists tournaments_status_idx on public.tournaments(status);
create index if not exists tournament_participants_idx on public.tournament_participants(tournament_id, player_id);
create index if not exists matches_tournament_idx on public.matches(tournament_id);
create index if not exists matches_players_idx on public.matches(player1_id, player2_id);
create index if not exists transactions_user_idx on public.transactions(user_id, type);
create index if not exists chat_messages_match_idx on public.chat_messages(match_id);
create index if not exists notifications_user_idx on public.notifications(user_id, read);

-- Create stored procedures
create or replace function public.join_tournament(
    p_tournament_id uuid,
    p_user_id uuid
) returns void as $$
declare
    v_tournament record;
    v_balance decimal;
begin
    -- Get tournament details
    select * into v_tournament
    from public.tournaments
    where id = p_tournament_id
    for update;
    
    -- Check tournament exists and is open
    if not found then
        raise exception 'Tournament not found';
    end if;
    
    if v_tournament.status != 'open' then
        raise exception 'Tournament is not open for registration';
    end if;
    
    -- Check if tournament is full
    if v_tournament.current_participants >= v_tournament.max_participants then
        raise exception 'Tournament is full';
    end if;
    
    -- Check user balance
    select wallet_balance into v_balance
    from public.profiles
    where id = p_user_id;
    
    if v_balance < v_tournament.entry_fee then
        raise exception 'Insufficient balance';
    end if;
    
    -- Add participant
    insert into public.tournament_participants (tournament_id, player_id)
    values (p_tournament_id, p_user_id);
    
    -- Update tournament participants count
    update public.tournaments
    set current_participants = current_participants + 1
    where id = p_tournament_id;
    
    -- Deduct entry fee
    update public.profiles
    set wallet_balance = wallet_balance - v_tournament.entry_fee
    where id = p_user_id;
    
    -- Create transaction record
    insert into public.transactions (user_id, amount, type, status, reference_id)
    values (p_user_id, v_tournament.entry_fee, 'entry_fee', 'completed', p_tournament_id);
    
    -- Check if tournament should start
    if v_tournament.current_participants + 1 = v_tournament.max_participants then
        update public.tournaments
        set status = 'in_progress'
        where id = p_tournament_id;
    end if;
end;
$$ language plpgsql security definer;

create or replace function public.process_prize_distribution(
    p_tournament_id uuid,
    p_winner_id uuid,
    p_amount decimal
) returns void as $$
begin
    -- Update winner's balance
    update public.profiles
    set wallet_balance = wallet_balance + p_amount
    where id = p_winner_id;
    
    -- Create transaction record
    insert into public.transactions (user_id, amount, type, status, reference_id)
    values (p_winner_id, p_amount, 'prize', 'completed', p_tournament_id);
end;
$$ language plpgsql security definer;

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;
alter table public.matches enable row level security;
alter table public.transactions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone"
    on public.profiles for select
    using (true);

create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Tournaments are viewable by everyone"
    on public.tournaments for select
    using (true);

create policy "Authenticated users can create tournaments"
    on public.tournaments for insert
    with check (auth.role() = 'authenticated');

create policy "Tournament participants are viewable by everyone"
    on public.tournament_participants for select
    using (true);

create policy "Matches are viewable by everyone"
    on public.matches for select
    using (true);

create policy "Match participants can update match results"
    on public.matches for update
    using (
        auth.uid() = player1_id or
        auth.uid() = player2_id
    );

create policy "Users can view own transactions"
    on public.transactions for select
    using (auth.uid() = user_id);

create policy "Chat messages are viewable by match participants"
    on public.chat_messages for select
    using (
        exists (
            select 1 from public.matches m
            where m.id = match_id
            and (m.player1_id = auth.uid() or m.player2_id = auth.uid())
        )
    );

create policy "Match participants can send chat messages"
    on public.chat_messages for insert
    with check (
        exists (
            select 1 from public.matches m
            where m.id = match_id
            and (m.player1_id = auth.uid() or m.player2_id = auth.uid())
        )
    );

create policy "Users can view own notifications"
    on public.notifications for select
    using (auth.uid() = user_id);