import { EventData, Page } from '@nativescript/core';
import { CreateTournamentViewModel } from './create-tournament-view-model';

export function onNavigatingTo(args: EventData) {
    const page = <Page>args.object;
    page.bindingContext = new CreateTournamentViewModel();
}