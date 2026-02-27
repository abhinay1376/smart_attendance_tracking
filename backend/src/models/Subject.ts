/**
 * Subject model.
 * Created by admin; multiple faculty can be assigned.
 */

import { Schema, model, Document } from 'mongoose'

export interface ISubject extends Document {
  name:            string
  code:            string
  /** Faculty email addresses assigned to this subject */
  assignedFaculty: string[]
  createdAt:       Date
}

const subjectSchema = new Schema<ISubject>(
  {
    name:            { type: String, required: true, trim: true },
    code:            { type: String, required: true, unique: true, uppercase: true, trim: true },
    assignedFaculty: { type: [String], default: [] },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
)

export const Subject = model<ISubject>('Subject', subjectSchema)
