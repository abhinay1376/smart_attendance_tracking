/**
 * Helpdesk ticket model.
 *
 * Lifecycle:
 *   student creates ticket → faculty replies → student follows up →
 *   faculty resolves → status = 'resolved'
 *
 * notifyHod: when true the admin/HoD dashboard surfaces this ticket.
 */

import { Schema, model, Document } from 'mongoose'

export type TicketStatus = 'open' | 'resolved'

export interface IChatMessage {
  sender: 'student' | 'faculty'
  text:   string
  sentAt: string
}

export interface IHelpdesk extends Document {
  studentEmail:      string
  studentName:       string
  facultyEmail:      string
  subject:           string
  message:           string
  status:            TicketStatus
  reply?:            string
  awaitingResponse:  boolean
  notifyHod:         boolean
  messages:          IChatMessage[]
  createdAt:         Date
  resolvedAt?:       Date
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    sender: { type: String, required: true, enum: ['student', 'faculty'] },
    text:   { type: String, required: true },
    sentAt: { type: String, required: true },
  },
  { _id: false },
)

const helpdeskSchema = new Schema<IHelpdesk>(
  {
    studentEmail:     { type: String, required: true, lowercase: true, trim: true },
    studentName:      { type: String, required: true, trim: true },
    facultyEmail:     { type: String, required: true, lowercase: true, trim: true },
    subject:          { type: String, required: true, trim: true },
    message:          { type: String, required: true },
    status:           { type: String, required: true, enum: ['open', 'resolved'], default: 'open' },
    reply:            { type: String },
    awaitingResponse: { type: Boolean, default: false },
    notifyHod:        { type: Boolean, default: false },
    messages:         { type: [chatMessageSchema], default: [] },
    resolvedAt:       { type: Date },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
)

// Index for fast per-faculty and per-student queries
helpdeskSchema.index({ facultyEmail: 1, status: 1 })
helpdeskSchema.index({ studentEmail: 1 })

export const Helpdesk = model<IHelpdesk>('Helpdesk', helpdeskSchema)
