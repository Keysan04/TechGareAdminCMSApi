import express from "express";
import { responder } from "../middlewares/response.js";
import {
  deleteAcategory,
  getCategories,
  insertCategory,
  updateCategory,
} from "../models/category/CategoryModel.js";
const router = express.Router();
import slugify from "slugify";

//create new category
router.post("/", async (req, res, next) => {
  try {
    const { title } = req.body;

    const obj = {
      title,
      slug: slugify(title, {
        lower: true,
        trim: true,
      }),
    };
    const cat = await insertCategory(obj);

    cat?._id
      ? responder.SUCCESS({
          res,
          message: "New Category Has been added successfully",
        })
      : responder.ERROR({
          res,
          message: "Unable to add new category, try again later",
        });
  } catch (error) {
    if (error.message.includes("E11000 duplicate key error collection")) {
      error.message =
        "Slug already exist,, try chaning the title and try again.";
      error.errorCode = 200;
    }
    next(error);
  }
});

//get category
router.get("/", async (req, res, next) => {
  try {
    const categories = await getCategories();
    responder.SUCCESS({
      res,
      message: "TO do get",
      categories,
    });
  } catch (error) {
    next(error);
  }
});

//update category
router.put("/", async (req, res, next) => {
  try {
    const { _id, title, status } = req.body;
    if (_id && title && status) {
      const cat = await updateCategory({ _id }, { title, status });

      if (cat?._id) {
        return responder.SUCCESS({
          res,
          message: "The Category has been updated",
        });
      }
    }

    responder.ERROR({
      res,
      message: "Invalid data",
    });
  } catch (error) {
    next(error);
  }
});

//delete category
router.delete("/:_id", async (req, res, next) => {
  try {
    const { _id } = req.params;
    const cat = await deleteAcategory(_id);

    cat?._id
      ? responder.SUCCESS({
          res,
          message: "The category has been deleted",
        })
      : responder.ERROR({
          res,
          message: "Error deleting Category, try again later",
        });
  } catch (error) {
    next(error);
  }
});

export default router;
