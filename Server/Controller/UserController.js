import cloudinary from "cloudinary";
import jwt from "jsonwebtoken";
import User from "../Model/UserModel.js";
import {
  BADGES,
  checkAllBadges,
  checkAndAwardRookieBadge,
} from "../utils/badgeSystem.js";
import mongoose from "mongoose";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dmehndmws",
  api_key: process.env.CLOUDINARY_API_KEY || "772976768998728",
  api_secret:
    process.env.CLOUDINARY_API_SECRET || "BXpWyZHYKbAexc3conUG88t6TVM",
});

// HELPER FUNCTION: Calculate consistent rank for any user
const calculateUserRank = async (userId) => {
  try {
    // Get all users with their scores (adjust scoring logic as needed)
    const allUsersWithScores = await User.aggregate([
      {
        $addFields: {
          totalScore: {
            $add: [
              { $multiply: [{ $ifNull: ["$StudyStats.totalHours", 0] }, 10] }, // 10 points per hour
              { $multiply: [{ $ifNull: ["$StudyStats.totalSessions", 0] }, 5] }, // 5 points per session
              { $multiply: [{ $ifNull: ["$streaks.current", 0] }, 3] }, // 3 points per streak day
              { $multiply: [{ $ifNull: ["$kudosReceived", 0] }, 2] }, // 2 points per kudos
            ]
          }
        }
      },
      { $sort: { totalScore: -1 } },
      { $project: { _id: 1, totalScore: 1 } }
    ]);

    // Find user's rank
    const userRank = allUsersWithScores.findIndex(user => 
      user._id.toString() === userId.toString()
    ) + 1;

    // Get user's score
    const userScore = allUsersWithScores.find(user => 
      user._id.toString() === userId.toString()
    )?.totalScore || 0;

    return { rank: userRank, totalScore: userScore };
  } catch (error) {
    console.error("Error calculating rank:", error);
    return { rank: 0, totalScore: 0 };
  }
};

// NEW ENDPOINT: Get user stats with consistent rank
const getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId || userId === "undefined") {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Get user details
    const user = await User.findById(userId).select("-Password").lean();
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate rank consistently
    const rankData = await calculateUserRank(userId);
    
    console.log("User Stats API - Rank Data:", rankData);
    
    const response = {
      userInfo: {
        firstName: user.FirstName,
        lastName: user.LastName,
        bio: user.Bio || "",
        profilePicture: user.ProfilePicture || "",
      },
      stats: {
        totalSessions: user.StudyStats?.totalSessions || 0,
        totalHours: user.StudyStats?.totalHours || 0,
        streaks: user.streaks || { current: 0, max: 0, lastStudyDate: null },
        monthlyLevel: user.MonthlyLevel || {},
        badges: user.Badges || [],
        goals: user.Goals || [],
        testData: user.TestData || {},
        totalScore: rankData.totalScore,
        rank: rankData.rank,
        leaderboard: {
          rank: rankData.rank,
          totalScore: rankData.totalScore,
          position: rankData.rank
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Failed to fetch user stats", details: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    console.log("updateProfile called");
    console.log(
      "req.user:",
      req.user ? { id: req.user._id, name: req.user.FirstName } : "No user"
    );
    console.log("Request body:", req.body);

    if (!req.user) {
      console.log("No user in request - auth middleware failed");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user._id;
    const updateData = req.body;

    const forbiddenFields = ["_id", "Email", "Password"];
    forbiddenFields.forEach((field) => {
      if (updateData[field]) {
        delete updateData[field];
      }
    });

    if (updateData.GraduationYear) {
      const currentYear = new Date().getFullYear();
      if (
        updateData.GraduationYear < 1900 ||
        updateData.GraduationYear > currentYear + 10
      ) {
        return res.status(400).json({ error: "Invalid graduation year" });
      }
    }

    if (updateData.Bio && updateData.Bio.length > 500) {
      return res
        .status(400)
        .json({ error: "Bio cannot exceed 500 characters" });
    }

    if (updateData.OtherDetails) {
      if (typeof updateData.OtherDetails !== "object") {
        return res
          .status(400)
          .json({ error: "OtherDetails must be an object" });
      }
      const MAX_DETAILS_LENGTH = 1000;
      Object.entries(updateData.OtherDetails).forEach(([key, value]) => {
        if (typeof value === "string" && value.length > MAX_DETAILS_LENGTH) {
          return res.status(400).json({
            error: `${key} in OtherDetails cannot exceed ${MAX_DETAILS_LENGTH} characters`,
          });
        }
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    ).select("-Password");

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check and award Rookie badge if profile is complete
    try {
      console.log("Profile updated, checking for Rookie badge...");
      const badgeResult = await checkAndAwardRookieBadge(userId);
      console.log("Badge check result:", badgeResult);

      if (badgeResult.success) {
        console.log(`Rookie badge awarded to user ${userId}`);
        // Re-fetch user to include the new badge
        const userWithBadge = await User.findById(userId).select("-Password");
        return res.status(200).json(userWithBadge);
      }
    } catch (badgeError) {
      console.error("Error checking Rookie badge:", badgeError);
      // Continue even if badge check fails
    }

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Profile update error:", error);
    return res
      .status(500)
      .json({ error: "Failed to update profile", details: error.message });
  }
};

// UPDATED: getUserDetails with consistent rank calculation
const getUserDetails = async (req, res) => {
  try {
    const userId = req.query.id;
    if (!userId || userId === "undefined") {
      return res
        .status(400)
        .json({ error: "User ID is required and cannot be undefined" });
    }

    const user = await User.findById(userId).select("-Password").lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate rank consistently (same logic as getUserStats)
    const rankData = await calculateUserRank(userId);
    
    console.log("User Details API - Rank Data:", rankData);

    const token = req.headers.authorization?.split(" ")[1];
    let relationshipStatus = "Add Friend";

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currUser = await User.findById(decoded.id).select(
          "friends friendRequests sentRequests kudosGiven"
        );

        if (currUser) {
          // Determine relationship status
          if (currUser.friends.includes(userId)) {
            relationshipStatus = "Friends";
          } else if (currUser.sentRequests.includes(userId)) {
            relationshipStatus = "Cancel Request";
          } else if (currUser.friendRequests.includes(userId)) {
            relationshipStatus = "Accept Request";
          }

          // Check if current user has given kudos to this user
          const hasGivenKudos = currUser.kudosGiven.includes(userId);
          
          return res.status(200).json({
            ...user,
            relationshipStatus,
            hasGivenKudos,
            // ADD CONSISTENT RANK DATA
            rank: rankData.rank,
            totalScore: rankData.totalScore,
            leaderboardData: {
              rank: rankData.rank,
              totalScore: rankData.totalScore,
              position: rankData.rank
            }
          });
        }
      } catch (err) {
        console.error("JWT verification error:", err);
        // Continue without auth data
      }
    }

    return res.status(200).json({
      ...user,
      relationshipStatus,
      hasGivenKudos: false,
      // ADD CONSISTENT RANK DATA
      rank: rankData.rank,
      totalScore: rankData.totalScore,
      leaderboardData: {
        rank: rankData.rank,
        totalScore: rankData.totalScore,
        position: rankData.rank
      }
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Failed to fetch user details" });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "profile_pictures",
      transformation: [
        { width: 500, height: 500, crop: "limit" }, // Resize and limit image size
        { quality: "auto" }, // Optimize image quality
      ],
    });

    // Update user's profile picture URL
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { ProfilePicture: result.secure_url },
      { new: true }
    ).select("-Password");

    return res.status(200).json({
      message: "Profile picture uploaded successfully",
      profilePictureUrl: result.secure_url,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile picture upload error:", error);
    return res.status(500).json({
      error: "Failed to upload profile picture",
      details: error.message,
    });
  }
};

// Get user badges
const getUserBadges = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user._id;
    console.log("Getting badges for user:", userId);

    const user = await User.findById(userId).select("badges Badges legacyBadges");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Handle both old and new badge field names
    const userBadges = user.Badges || user.badges || user.legacyBadges || [];
    console.log("Current user badges:", userBadges);

    // Check for any newly earned badges
    try {
      console.log("Checking for new badges...");
      const newBadges = await checkAllBadges(userId);
      console.log("New badges found:", newBadges);

      if (newBadges.length > 0) {
        // Re-fetch user to get updated badges
        const updatedUser = await User.findById(userId).select("badges Badges legacyBadges");
        const updatedBadges = updatedUser.Badges || updatedUser.badges || updatedUser.legacyBadges || [];
        console.log("Updated user badges after awarding:", updatedBadges);

        return res.status(200).json({
          badges: updatedBadges,
          newBadges: newBadges,
          availableBadges: Object.values(BADGES),
        });
      }
    } catch (badgeError) {
      console.error("Error checking badges:", badgeError);
      // Continue with existing badges if check fails
    }

    return res.status(200).json({
      badges: userBadges,
      newBadges: [],
      availableBadges: Object.values(BADGES),
    });
  } catch (error) {
    console.error("Get badges error:", error);
    return res.status(500).json({
      error: "Failed to get badges",
      details: error.message,
    });
  }
};

const giveKudos = async (req, res) => {
  try {
    const giverId = req.user.id;
    const { receiverId } = req.body;

    if (giverId === receiverId) {
      return res
        .status(400)
        .json({ message: "You cannot give kudos to yourself." });
    }

    const giver = await User.findById(giverId);
    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    if (giver.kudosGiven.includes(receiverId)) {
      return res
        .status(400)
        .json({ message: "You have already given kudos to this user." });
    }

    giver.kudosGiven.push(receiverId);
    receiver.kudosReceived = (receiver.kudosReceived || 0) + 1;

    await giver.save();
    await receiver.save();

    res.status(200).json({
      message: "Kudos given successfully!",
      receiverKudos: receiver.kudosReceived,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export {
  getUserBadges,
  getUserDetails,
  getUserStats, // NEW EXPORT
  giveKudos,
  updateProfile,
  uploadProfilePicture,
};