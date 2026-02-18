import jamsilImg from '../assets/stadiums/jamsil.png';
import sajikImg from '../assets/stadiums/lotte.webp';
import gocheokImg from '../assets/stadiums/kiwoom.jpg';
import changwonImg from '../assets/stadiums/nc.jpg';
import incheonImg from '../assets/stadiums/ssg.jpg';
import hanwhaImg from '../assets/stadiums/hanwha.png';
import kiaImg from '../assets/stadiums/kia.png';
import ktImg from '../assets/stadiums/kt.webp';
import samsungImg from '../assets/stadiums/samsung.webp';

export interface StadiumMapData {
    id: string;
    name: string;
    mapImage: string;
}

export const STADIUM_DATA: Record<string, StadiumMapData> = {
    '잠실 야구장': {
        id: 'jamsil',
        name: '잠실 야구장',
        mapImage: jamsilImg
    },
    '사직 야구장': {
        id: 'sajik',
        name: '사직 야구장',
        mapImage: sajikImg
    },
    '고척 스카이돔': {
        id: 'gocheok',
        name: '고척 스카이돔',
        mapImage: gocheokImg
    },
    '창원 NC파크': {
        id: 'changwon',
        name: '창원 NC파크',
        mapImage: changwonImg
    },
    '인천 SSG 랜더스필드': {
        id: 'incheon',
        name: '인천 SSG 랜더스필드',
        mapImage: incheonImg
    },
    '한화생명 이글스파크': {
        id: 'hanwha',
        name: '한화생명 이글스파크',
        mapImage: hanwhaImg
    },
    '광주 기아 챔피언스 필드': {
        id: 'kia',
        name: '광주 기아 챔피언스 필드',
        mapImage: kiaImg
    },
    '대구 삼성 라이온즈 파크': {
        id: 'samsung',
        name: '대구 삼성 라이온즈 파크',
        mapImage: samsungImg
    },
    '수원 KT 위즈파크': {
        id: 'kt',
        name: '수원 KT 위즈파크',
        mapImage: ktImg
    }
};
