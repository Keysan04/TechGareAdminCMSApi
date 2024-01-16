import CategorySchema from "./CategorySchema.js";

//insert new category
export const insertCategory = (categoryObj) => {
  return CategorySchema(categoryObj).save();
};
export const updateCategory = (filter, update) => {
  return CategorySchema.findOneAndUpdate(filter, update, { new: true });
};

//get category by filter
export const getCategories = () => {
  return CategorySchema.find();
};

//get category by filter
export const getACategory = (filter) => {
  return CategorySchema.findOne(filter);
};

export const deleteAcategory = (_id) => {
  return CategorySchema.findByIdAndDelete(_id);
};
