import { ObjectId } from 'bson';

export const createObjectIdString = () => {
  return new ObjectId().toHexString();
};
