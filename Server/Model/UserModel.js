import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    FirstName: { type: String, required: true },
    LastName: { type: String },
    Email: { type: String, required: true, unique: true },
    Password: {
      type: String,
      required: function () {
        return this.oauthProvider ? false : true;
      },
    },
    oauthProvider: { type: String },
    oauthId: { type: String },
    
    ProfilePicture: { type: String, default: "" },
    Bio: { type: String, maxlength: 500 },
    Gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
    },
    University: { type: String },
    Country: { type: String },
    FieldOfStudy: { type: String },
    GraduationYear: { type: Number, min: 1900, max: 2100 },
    OtherDetails: { type: mongoose.Schema.Types.Mixed },
    
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    kudosGiven: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    kudosReceived: { type: Number, default: 0 },
    
    notes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Note" }],
    tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    
    streaks: {
      current: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      lastStudyDate: { type: Date },
    },
    
    // ADD THESE MISSING FIELDS:
    StudyStats: {
      totalSessions: { type: Number, default: 0 },
      totalHours: { type: Number, default: 0 },
      weeklyGoal: { type: Number, default: 0 },
      monthlyGoal: { type: Number, default: 0 },
    },
    
    MonthlyLevel: {
      currentLevel: { type: Number, default: 1 },
      currentXP: { type: Number, default: 0 },
      xpToNextLevel: { type: Number, default: 100 },
      monthlyProgress: { type: Number, default: 0 },
    },
    
    Badges: [{
      id: { type: String },
      name: { type: String },
      description: { type: String },
      icon: { type: String },
      earnedAt: { type: Date, default: Date.now },
      category: { type: String },
    }],
    
    Goals: [{
      id: { type: String },
      title: { type: String },
      description: { type: String },
      targetValue: { type: Number },
      currentValue: { type: Number, default: 0 },
      unit: { type: String }, // e.g., "hours", "sessions", "days"
      deadline: { type: Date },
      completed: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    }],
    
    Leaderboard: {
      rank: { type: Number, default: 0 },
      totalScore: { type: Number, default: 0 },
      weeklyRank: { type: Number, default: 0 },
      monthlyRank: { type: Number, default: 0 },
    },
    
    TestData: {
      testsCompleted: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      bestScore: { type: Number, default: 0 },
      totalTestTime: { type: Number, default: 0 },
    },
    
    SessionRooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "SessionRoom" }],
    
    // Keep your existing badges field (renaming it to avoid conflict)
    legacyBadges: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      description: { type: String },
      icon: { type: String },
      earnedAt: { type: Date, default: Date.now },
    }],
    
    deletionOTP: {
      code: { type: String },
      expiresAt: { type: Date },
      verified: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", UserSchema);
export default User;
