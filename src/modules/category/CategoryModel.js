import CategorySchema from "./CategorySchema.js";

//insert new user
export const insertCategory = (categoryObj) => {
  return CategorySchema(categoryObj).save();
};
export const updateCategory = (filter, update) => {
  return CategorySchema.findOneAndUpdate(filter, update, { new: true });
};

//get user by filter

export const getCategories = () => {
  return CategorySchema.findOne();
};
export const deleteACategory = (_id) => {
  return CategorySchema.findByIdAndDelete(_id);
};
