import { UserInfo } from 'firebase';
export class User implements UserInfo {
    constructor(
        public displayName: string | null,
        public email: string | null,
        public photoURL: string | null,
        public providerId: string,
        public uid: string) {
    }
}