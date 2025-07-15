
export type TEvent = {
    id: string;
    title: string;
    slug: string;
    description: string;
    start_date: Date;
    end_date: Date;
    createdAt: Date;
    min_bet: number;
    max_bet: number;
    sot: string;
    traders: string;
    quantity: number
}