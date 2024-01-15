import UserSchema from "./UserSchema.js";

//insert new user
export const insertUser = (userObj) => {
  return UserSchema(userObj).save();
};
export const updateUser = (filter, update) => {
  return UserSchema.findOneAndUpdate(filter, update, { new: true });
};

//get user by filter
export const getAUser = (filter) => {
  return UserSchema.findOne(filter);
};
