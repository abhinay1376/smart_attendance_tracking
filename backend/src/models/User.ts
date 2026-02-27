/**
 * User model — admin and faculty accounts.
 *
 * Faculty go through a signup request flow:
 *   pending → approved (they can log in) | rejected
 *
 * Admin is seeded on first run from environment variables.
 */

import { Schema, model, Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export type UserRole   = 'admin' | 'faculty'
export type UserStatus = 'pending' | 'approved' | 'rejected'

export interface IUser extends Document {
  name:       string
  email:      string
  password:   string
  role:       UserRole
  status:     UserStatus
  facultyId?: string
  phone?:     string
  dob?:       string
  note?:      string
  createdAt:  Date

  /** Compare a plain-text password with the stored hash */
  comparePassword(plain: string): Promise<boolean>
}

const userSchema = new Schema<IUser>(
  {
    name:      { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true },
    role:      { type: String, required: true, enum: ['admin', 'faculty'], default: 'faculty' },
    status:    { type: String, required: true, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    facultyId: { type: String, trim: true },
    phone:     { type: String, trim: true },
    dob:       { type: String },
    note:      { type: String },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
)

// Hash password before saving (only when it's new or changed)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

userSchema.methods.comparePassword = function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.password)
}

export const User = model<IUser>('User', userSchema)
