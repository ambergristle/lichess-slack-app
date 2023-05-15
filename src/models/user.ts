import { Document, type IDocument } from './document';
import { ZUser, ZUserData } from 'schemas/user';
import type { TUser, TUserData } from 'schemas/user';

interface IUser extends IDocument, TUser {}

export class User extends Document implements IUser {

  public _schema = ZUser;

  public fullName: string;
  public email: string;
  public roles: string[];

  private constructor(params: TUserData) {
    super(ZUser);

    const userData = ZUserData.parse(params);

    this.fullName = userData.fullName;
    this.email = userData.email;

    this.roles = userData.roles;

    this.parse();
  }

  public init(params: TUserData) {
    return new User(params);
  }

}
