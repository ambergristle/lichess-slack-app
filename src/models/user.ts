import { Document, type IDocument } from './document';
import { ZUser, type TUser } from '../schemas/user';

interface IUser extends IDocument, TUser {}

export class User extends Document implements IUser {

  public _schema = ZUser;

  public fullName: string;
  public email: string;
  public roles: any;

  constructor() {
    super();
  }

}
