import { decode } from "jsonwebtoken";
import { getSession } from "../modules/session/SessionSchema.js";
import { getAUser } from "../modules/user/userModule.js";
import {
  createAccessJWT,
  verifyAccessJWT,
  verifyRefreshJWT,
} from "../utils/jwt.js";
import { responder } from "./response.js";

export const adminAuth = async (req, res, next) => {
  try {
    //get the accessJWT and verify
    const { authorization } = req.headers;
    const decoded = await verifyAccessJWT(authorization);

    if (decoded?.email) {
      //check if the token in  the db

      const token = await getSession({
        token: authorization,
        associate: decoded.email,
      });

      if (token?._id) {
        //get user by email

        const user = await getAUser({ email: decoded.email });

        if (user?.status === "active" && user?.role === "admin") {
          user.password = undefined;
          req.userInfo = user;
          return next();
        }
      }
    }

    responder.ERROR({
      res,
      message: "unauthorize",
      errorCode: 401,
    });
  } catch (error) {
    //if token is expired, handle here
    next(error);
  }
};

export const refreshAuth = async (req, res, next) => {
  try {
    const { authorization } = req.headers;
    const decoded = verifyRefreshJWT(authorization);
    if (decoded?.email) {
      const user = await getUser({
        email: decoded.email,
        refreshJWT: authorization,
      });
      if (user?._id && user?.status === "active") {
        const accessJWT = await createAccessJWT(decoded.email);
        return responder.SUCCESS({
          res,
          message: "here is the accessJWT",
          accessJWT,
        });
      }
    }
    responder.ERROR({
      res,
      message: "Ther is a problem with jwt",
    });
  } catch (error) {}
};
