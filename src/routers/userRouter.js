import express from "express";
import {
  getAUser,
  insertUser,
  updateUser,
} from "../modules/user/userModule.js";
import { comparePassword, hashPassword } from "../utils/bcrypt.js";
import { newAdminValidation } from "../middlewares/joiValidation.js";
import { responder } from "../middlewares/response.js";
let router = express.Router();
import { v4 as uuidv4 } from "uuid";
import {
  createNewSession,
  deleteSession,
} from "../modules/session/SessionSchema.js";
import {
  sendEmailVerificationLinkEail,
  sendEmailVerifiedNotificationnEmail,
} from "../utils/nodemailer.js";
import { getJwts } from "../utils/jwt.js";
import { adminAuth } from "../middlewares/authMiddleware.js";

// pulic routers

// /verify user email
router.post("/verify-email", async (req, res, next) => {
  try {
    const { associate, token } = req.body;
    if (associate && token) {
      // delete from session.
      const session = await deleteSession({ token, associate });

      //if success, then update user status to active
      if (session?._id) {
        // update user table
        const user = await updateUser(
          { email: associate },
          { status: "active" }
        );

        if (user?._id) {
          //send email notification

          sendEmailVerifiedNotificationnEmail({
            email: associate,
            fName: user.fName,
          });
          return responder.SUCCESS({
            res,
            message: "You email verified. you may sign in now",
          });
        }
      }
    }
    responder.ERROR({
      res,
      message: "Invalid or expired Link",
    });
  } catch (error) {
    next(error);
  }
});
//login user
router.post("/signin", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (email && password) {
      // get user by email

      const user = await getAUser({ email });
      if (user?.status === "inactive") {
        return responder.ERROR({
          res,
          message:
            "Your accout has not been verifed. Chek your email to verify or contact admin",
        });
      }

      if (user?._id) {
        // verify password matched

        const isPassMatched = comparePassword(password, user.password);

        if (isPassMatched) {
          // create and store tokens

          const jwts = await getJwts(email);
          console.log(jwts);
          // response tokens
          return responder.SUCCESS({
            res,
            message: "Login successfully",
            jwts,
          });
        }
      }
    }
    responder.ERROR({
      res,
      message: "Invalid Login Details",
    });
  } catch (error) {
    next(error);
  }
});

//add server side validation
router.post("/", newAdminValidation, async (req, res, next) => {
  try {
    const { password } = req.body;
    // encrypt the password
    req.body.password = hashPassword(password);

    const user = await insertUser(req.body);

    //if user is created, create unique url and email that to user
    if (user?._id) {
      const c = uuidv4(); //this must be store in DB
      const toke = await createNewSession({ token: c, associate: user.email });

      if (toke?._id) {
        const url = `${process.env.CLINT_ROOT_DOMAIN}/verify-email?e=${user.email}&c=${c}`;

        //send new email
        sendEmailVerificationLinkEail({
          email: user.email,
          url,
          fName: user.fName,
        });
      }
    }

    user?._id
      ? responder.SUCCESS({
          res,
          message: "Check your inbox/span to verify your email",
        })
      : responder.ERROR({
          res,
          errorCode: 200,
          message: "Unable to create new user, try again later",
        });
  } catch (error) {
    if (error.message.includes("E11000 duplicate key error collection")) {
      error.errorCode = 200;
      error.message = "There is another user, have used this email already";
    }
    next(error);
  }
});

// get user profile by user login

router.get("/", adminAuth, (req, res, next) => {
  try {
    responder.SUCCESS({
      res,
      message: "here is the user data",
      user: req.userInfo,
    });
  } catch (error) {
    next(error);
  }
});
router.get("/getAccessJWT");

router.post("/logout", async (req, res, next) => {
  try {
    const { accessJWT, refreshJWT, _id } = req.body;
    accessJWT &&
      (await deleteSession({
        token: accessJWT,
      }));

    await updateUser({ _id }, { refreshJWT: "" });
    responder.SUCCESS({
      res,
      message: "user logged out successfully",
    });
  } catch (error) {}
});
export default router;
