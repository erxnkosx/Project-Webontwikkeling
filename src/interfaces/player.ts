export type PositionType = "GK" | "DEF" | "MID" | "FWD";

export interface PlayerClubRef {
    id: string;
    name: string;
}

export interface Player {
    id: string;
    name: string;
    description: string;
    age: number;
    isBasisspeler: boolean;
    birthDate: string;
    imageUrl: string;
    rugnummer: number;
    position: string;
    positionType: PositionType;
    skills: string[];

    heightCm: number;
    weightKg: number;
    marketValueEur: number;

    club: PlayerClubRef;
}
