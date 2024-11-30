export class PrizePoolCalculator {
    private readonly PLATFORM_FEE_PERCENTAGE = 10;
    private readonly PRIZE_DISTRIBUTION = {
        first: 60,
        second: 30,
        third: 10
    };

    calculateTotal(entryFee: number, participants: number): number {
        const totalPool = entryFee * participants;
        const platformFee = (totalPool * this.PLATFORM_FEE_PERCENTAGE) / 100;
        return totalPool - platformFee;
    }

    calculatePrize(totalPrizePool: number, position: number): number {
        let percentage = 0;
        switch (position) {
            case 1:
                percentage = this.PRIZE_DISTRIBUTION.first;
                break;
            case 2:
                percentage = this.PRIZE_DISTRIBUTION.second;
                break;
            case 3:
                percentage = this.PRIZE_DISTRIBUTION.third;
                break;
            default:
                return 0;
        }
        return (totalPrizePool * percentage) / 100;
    }
}