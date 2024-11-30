import { EventData, Page } from '@nativescript/core';
import { MatchFinderViewModel } from './match-finder-view-model';

export function onNavigatingTo(args: EventData) {
    const page = <Page>args.object;
    page.bindingContext = new MatchFinderViewModel();
}