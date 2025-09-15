import { DarkState } from "@shared/types";
import { atom } from 'jotai';


export const darkStateAtom = atom<DarkState>(false);
