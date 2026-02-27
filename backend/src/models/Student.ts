/**
 * Student model.
 * Students log in with email + regNo (regNo is stored hashed).
 * Added by admin or faculty.
 */

import { Schema, model, Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IStudent extends Document {
  name:      string
  email:     string
  /** Plain registration number — for display purposes */
  rollNo:    string
  /** Hashed registration number — used as login password */
  regNo:     string
  phone?:    string
  /** Array of subject codes the student is enrolled in */
  classId:   string[]
  /** 'admin' or a faculty email — who added this student */
  addedBy:   string
  createdAt: Date

  compareRegNo(plain: string): Promise<boolean>
}

const studentSchema = new Schema<IStudent>(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    rollNo:   { type: String, default: '' },   // plain text — for display
    regNo:    { type: String, required: true }, // bcrypt hash — for auth
    phone:    { type: String, trim: true },
    classId:  { type: [String], default: [] },
    addedBy:  { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
)

// Before hashing, save the plain regNo into rollNo for display
studentSchema.pre('save', async function (next) {
  if (!this.isModified('regNo')) return next()
  // Preserve plain text in rollNo (unless already set by caller)
  if (!this.rollNo) this.rollNo = this.regNo
  this.regNo = await bcrypt.hash(this.regNo, 10)
  next()
})

studentSchema.methods.compareRegNo = function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.regNo)
}

export const Student = model<IStudent>('Student', studentSchema)
