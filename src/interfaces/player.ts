export type PositionType = 'GK' | 'DEF' | 'MID' | 'FWD';

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
    club: {
        id: string;
        name: string;
    };
}