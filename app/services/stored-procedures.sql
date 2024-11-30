-- Add this to your existing stored procedures

-- Submit Match Result procedure
create or replace function submit_match_result(
  p_match_id uuid,
  p_player1_score integer,
  p_player2_score integer,
  p_winner_id uuid
) returns void as $$
declare
  v_match record;
begin
  -- Get match details
  select * into v_match
  from matches
  where id = p_match_id
  for update;

  -- Validate match exists
  if not found then
    raise exception 'Match not found';
  end if;

  -- Validate match status
  if v_match.status != 'in_progress' then
    raise exception 'Match is not in progress';
  end if;

  -- Validate winner is a participant
  if p_winner_id != v_match.player1_id and p_winner_id != v_match.player2_id then
    raise exception 'Invalid winner';
  end if;

  -- Update match
  update matches
  set
    player1_score = p_player1_score,
    player2_score = p_player2_score,
    winner_id = p_winner_id,
    status = 'completed'
  where id = p_match_id;

  -- If this is a tournament match, update tournament progress
  if v_match.tournament_id is not null then
    perform update_tournament_progress(v_match.tournament_id);
  end if;
end;
$$ language plpgsql;

-- Update Tournament Progress procedure
create or replace function update_tournament_progress(p_tournament_id uuid) returns void as $$
declare
  v_completed_matches integer;
  v_total_matches integer;
begin
  -- Get match counts
  select 
    count(*) filter (where status = 'completed'),
    count(*)
  into v_completed_matches, v_total_matches
  from matches
  where tournament_id = p_tournament_id;

  -- Update tournament status if all matches are completed
  if v_completed_matches = v_total_matches then
    update tournaments
    set status = 'completed'
    where id = p_tournament_id;
  end if;
end;
$$ language plpgsql;