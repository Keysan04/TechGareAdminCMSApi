import express from "express";
import {
  getAUser,
  getAdminPasswordById,
  insertUser,
  updateUser,
} from "../models/user/UserModel.js";
import { comparePassword, hashPassword } from "../utils/bcrypt.js";
import {
  newAdminValidation,
  resetPasswordValidation,
} from "../middlewares/joiValidation.js";
import { responder } from "../middlewares/response.js";
let router = express.Router();
import { v4 as uuidv4 } from "uuid";
import {
  createNewSession,
  deleteSession,
} from "../models/session/SessionSchema.js";
import {
  passwordUpdateNotificationEmail,
  profileUpdateNotificationEmail,
  sendEmailVerificationLinkEail,
  sendEmailVerifiedNotificationnEmail,
  sendOtpEmail,
} from "../utils/nodemailer.js";
import { getJwts } from "../utils/jwt.js";
import { adminAuth, refreshAuth } from "../middlewares/authMiddleware.js";
import { otpGenerator } from "../utils/randomGenerator.js";

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

// router.get("/randomApi", (req, res, next) => {
//   try {
//     console.log(res.data);
//     responder.SUCCESS({
//       res,
//       message: "checkout the list of users",
//     });
//   } catch (error) {
//     next(error);
//   }
// });

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
router.put("/update", adminAuth, async (req, res, next) => {
  try {
    const { _id, fName, lName, phone, address, ...rest } = req.body;
    console.log(rest);
    // filter, id;
    const user = await updateUser({ _id }, { fName, lName, phone, address });
    console.log(user);
    //if user is created, create unique url and email that to user
    user?._id &&
      profileUpdateNotificationEmail({
        email: user.email,
        fName: user.fName,
      });
    user?._id
      ? responder.SUCCESS({
          res,
          message: "Your profile has been updated",
        })
      : responder.ERROR({
          res,
          errorCode: 200,
          message: "Unable to update  profile, try again later",
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

router.get("/get-accessjwt", refreshAuth);

///logout

router.post("/logout", async (req, res, next) => {
  try {
    const { accessJWT, _id } = req.body;
    accessJWT &&
      (await deleteSession({
        token: accessJWT,
      }));

    await updateUser({ _id }, { refreshJWT: "" });

    responder.SUCCESS({
      res,
      message: "User loged out successfuylly",
    });
  } catch (error) {
    next(error);
  }
});

//otp request
router.post("/request-otp", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (email.includes("@")) {
      //check if user exist
      const user = await getAUser({ email });

      if (user._id) {
        // create uniquest otp
        const otp = otpGenerator();

        // store opt and email in the session table
        const otpSession = await createNewSession({
          token: otp,
          associate: email,
        });
        if (otpSession?._id) {
          // send email to user
          sendOtpEmail({
            fName: user.fName,
            email,
            otp,
          });
        }
      }
    }

    responder.SUCCESS({
      res,
      message:
        "IF your email is found in our system, we will send otp to your email. Please check your Junk/spam folder as well",
    });
  } catch (error) {
    next(error);
  }
});

//password reset
router.patch("/", resetPasswordValidation, async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;

    // if otp is valid

    const session = await deleteSession({
      token: otp,
      associate: email,
    });

    if (session?._id) {
      //encryp password

      const hashPass = hashPassword(password);

      // update password in user table
      const user = await updateUser({ email }, { password: hashPass });

      if (user?._id) {
        //send email notificaion
        passwordUpdateNotificationEmail({
          fName: user.fName,
          email,
        });

        return responder.SUCCESS({
          res,
          message: "Your password has been udpate, you may login now!",
        });
      }
    }

    responder.ERROR({
      res,
      message: "Invalid token, try again later",
    });
  } catch (error) {
    next(error);
  }
});

// password update

router.patch("/password", adminAuth, async (req, res, next) => {
  try {
    // get user info
    const user = req.userInfo;
    const { oldPassword, newPassword } = req.body;

    // get password from db by user _id
    const { password } = await getAdminPasswordById(user._id);

    // macth the oldPass with db pass
    const isMatched = comparePassword(oldPassword, password);
    // encrypt new pass
    if (isMatched) {
      const newHashPass = hashPassword(newPassword);
      // update user table with new pass
      const updatedUser = await updateUser(
        { _id: user._id },
        { password: newHashPass }
      );

      if (updatedUser?._id) {
        //send email notification
        passwordUpdateNotificationEmail({
          fName: user.fName,
          email: user.email,
        });
        return responder.SUCCESS({
          res,
          message: "Your password has been updated",
        });
      }
    }

    responder.ERROR({
      res,
      message: "Unable to update the password, try again later",
    });
  } catch (error) {
    next(error);
  }
});

// profile update

export default router;
