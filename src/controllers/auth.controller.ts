import type { Request, Response } from "express";
import prisma from "../db/prisma.js";
import bcryptjs from "bcryptjs";
import generateToken from "../utils/generateToken.js";

import { OAuth2Client } from "google-auth-library";

import axios from "axios";

export const signup = async (req: Request, res: Response) => {
  try {
    const { fullname, username, email, password, confirmPassword, gender } =
      req.body;

    if (!fullname || !username || !password || !confirmPassword || !gender) {
      return res.status(400).json({ error: "Please fill in all fields" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Password don't match" });
    }

    const user = await prisma.user.findUnique({ where: { username } });

    if (user) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        fullname,
        username,
        email,
        bio: "",
        password: hashedPassword,
        gender,
        profilePicture: `https://avatar.iran.liara.run/public/${
          gender === "male" ? "boy" : "girl"
        }?username=${username}`,
      },
    });

    if (newUser) {
      generateToken(newUser.id, res);

      res.status(201).json({
        id: newUser.id,
        fullname: newUser.fullname,
        username: newUser.username,
        email: newUser.email,
        bio: newUser.bio,
        gender: newUser.gender,
        profilePicture: newUser.profilePicture,
      });
    } else {
      res.status(400).json({ error: "Invalid user data" });
    }
  } catch (error: any) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcryptjs.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    generateToken(user.id, res);

    res.status(200).json({
      id: user.id,
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      bio: user.bio,
      gender: user.gender,
      profilePicture: user.profilePicture,
    });
  } catch (error: any) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const loginOAuthCallback = async (req: Request, res: Response) => {
  const { code } = req.query;
  try {
    const oAuth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    const r = await oAuth2Client.getToken(code as string);
    // Make sure to set the credentials on the OAuth2 client.
    oAuth2Client.setCredentials(r.tokens);
    const { data: profile } = await axios.get(
      "https://www.googleapis.com/oauth2/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${oAuth2Client.credentials.access_token}`,
        },
      }
    );
    let user = await prisma.user.findUnique({ where: { id: profile.id } });
    if (!user) {
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash("google_" + profile.id, salt);

      user = await prisma.user.create({
        data: {
          id: profile.id,
          fullname: profile.name,
          username: profile.email,
          password: hashedPassword,
          email: profile.email,
          bio: "",
          loginType: "google",
          profilePicture: profile.picture,
        },
      });
    }
    generateToken(user.id, res);

    res.status(200).json({
      id: user.id,
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      bio: user.bio,
      profilePicture: user.profilePicture,
    });
  } catch (error: any) {
    console.log("Error in loginOAuthCallback controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const loginOAuth = async (req: Request, res: Response) => {
  try {
    const oAuth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    const scopes = [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];
    const authorizationUrl: string = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
    });
    res.redirect(authorizationUrl);
  } catch (error: any) {
    console.log("Error in loginOAuth controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const toggleFollow = async (req: Request, res: Response) => {
  try {
    const { followerId } = req.body;
    const follower = await prisma.user.findUnique({
      where: { id: followerId },
    });
    if (!follower) {
      return res.status(400).json({ error: "Invalid follower" });
    }
    const connection = await prisma.connection.findFirst({
      where: { followerId: followerId, followingId: req.user.id },
    });
    if (!connection) {
      const newConnection = await prisma.connection.create({
        data: {
          followerId,
          followingId: req.user.id,
        },
      });
      return res.status(200).json({newConnection});
    } 
    const deletedConnection = await prisma.connection.delete({
      where: { id: connection.id },
    });
    return res.status(200).json({deletedConnection});
  } catch (error: any) {
    console.log("Error in getUserInfo controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json("Logged out successfully");
  } catch (error: any) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUserInfo = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    return res.status(200).json({
      id: user.id,
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      bio: user.bio,
      gender: user.gender,
      profilePicture: user.profilePicture,
    });
  } catch (error: any) {
    console.log("Error in getUserInfo controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
