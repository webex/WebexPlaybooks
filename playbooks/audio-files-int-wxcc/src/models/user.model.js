import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  openidProviderId: {
    type: String,
    required: true,
  },
  givenName: {
    type: String,
    required: true
  },
  familyName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  accessToken: {
    type: String,
    required: true,
    unique: true
  },
  refreshToken: {
    type: String,
    required: true,
    unique: true
  },
  orgId: {
    type: String,
    required: true,
    unique: true
  },
  profilePicture: {
    type: String
  },
},
{
    timestamps: true,
});

const User = mongoose.model('User', userSchema);

export default User;