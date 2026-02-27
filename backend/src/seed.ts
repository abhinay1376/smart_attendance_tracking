/**
 * Seed script — populates the DB with realistic sample data.
 *
 * Run with:
 *   npx ts-node --transpile-only src/seed.ts
 *
 * Safe to run multiple times — uses upsert / findOneAndUpdate so existing
 * documents are not duplicated.
 */

import 'dotenv/config'
import mongoose from 'mongoose'

import { connectDB }          from './config/db'
import { User }               from './models/User'
import { Student }            from './models/Student'
import { Subject }            from './models/Subject'

// ─── Seed data ───────────────────────────────────────────────────────────────

const FACULTY = [
  {
    name:      'Dr. Ramesh Kumar',
    email:     'ramesh.kumar@college.edu',
    password:  'faculty123',
    facultyId: 'FAC001',
    phone:     '9876543210',
    dob:       '1980-03-15',
    status:    'approved' as const,
  },
  {
    name:      'Prof. Sunita Sharma',
    email:     'sunita.sharma@college.edu',
    password:  'faculty123',
    facultyId: 'FAC002',
    phone:     '9876543211',
    dob:       '1985-07-22',
    status:    'approved' as const,
  },
  {
    name:      'Dr. Anil Verma',
    email:     'anil.verma@college.edu',
    password:  'faculty123',
    facultyId: 'FAC003',
    phone:     '9876543212',
    dob:       '1978-11-09',
    status:    'approved' as const,
  },
  {
    name:      'Ms. Priya Nair',
    email:     'priya.nair@college.edu',
    password:  'faculty123',
    facultyId: 'FAC004',
    phone:     '9876543213',
    dob:       '1990-05-30',
    status:    'pending' as const,   // awaiting HoD approval — tests the Requests page
  },
]

const STUDENTS = [
  { name: 'Aarav Singh',      email: 'aarav.singh@student.edu',      regNo: 'CS2021001', phone: '8800001111', classId: 'CS-A' },
  { name: 'Diya Patel',       email: 'diya.patel@student.edu',       regNo: 'CS2021002', phone: '8800002222', classId: 'CS-A' },
  { name: 'Vivaan Mehta',     email: 'vivaan.mehta@student.edu',     regNo: 'CS2021003', phone: '8800003333', classId: 'CS-A' },
  { name: 'Ananya Reddy',     email: 'ananya.reddy@student.edu',     regNo: 'CS2021004', phone: '8800004444', classId: 'CS-B' },
  { name: 'Arjun Gupta',      email: 'arjun.gupta@student.edu',      regNo: 'CS2021005', phone: '8800005555', classId: 'CS-B' },
  { name: 'Ishaan Joshi',     email: 'ishaan.joshi@student.edu',     regNo: 'CS2021006', phone: '8800006666', classId: 'CS-B' },
  { name: 'Kavya Pillai',     email: 'kavya.pillai@student.edu',     regNo: 'EC2021001', phone: '8800007777', classId: 'EC-A' },
  { name: 'Rohan Desai',      email: 'rohan.desai@student.edu',      regNo: 'EC2021002', phone: '8800008888', classId: 'EC-A' },
  { name: 'Saanvi Iyer',      email: 'saanvi.iyer@student.edu',      regNo: 'EC2021003', phone: '8800009999', classId: 'EC-A' },
  { name: 'Kabir Chaudhary',  email: 'kabir.chaudhary@student.edu',  regNo: 'ME2021001', phone: '8800010000', classId: 'ME-A' },
]

const SUBJECTS = [
  {
    name: 'Data Structures & Algorithms',
    code: 'CS301',
    assignedFaculty: ['ramesh.kumar@college.edu'],
  },
  {
    name: 'Operating Systems',
    code: 'CS302',
    assignedFaculty: ['ramesh.kumar@college.edu', 'sunita.sharma@college.edu'],
  },
  {
    name: 'Database Management Systems',
    code: 'CS303',
    assignedFaculty: ['sunita.sharma@college.edu'],
  },
  {
    name: 'Computer Networks',
    code: 'CS304',
    assignedFaculty: ['anil.verma@college.edu'],
  },
  {
    name: 'Electronics Fundamentals',
    code: 'EC301',
    assignedFaculty: ['anil.verma@college.edu'],
  },
]

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  await connectDB()

  // ── 1. Faculty users ────────────────────────────────────────────────────────
  console.log('\n[Seed] Upserting faculty…')
  for (const f of FACULTY) {
    const existing = await User.findOne({ email: f.email })
    if (existing) {
      console.log(`  [SKIP] ${f.email} already exists`)
      continue
    }
    await User.create({
      name:      f.name,
      email:     f.email,
      password:  f.password,   // plain text — model pre-save hook hashes it
      role:      'faculty',
      status:    f.status,
      facultyId: f.facultyId,
      phone:     f.phone,
      dob:       f.dob,
    })
    console.log(`  [OK]   ${f.email}  (${f.status})`)
  }

  // ── 2. Students ─────────────────────────────────────────────────────────────
  console.log('\n[Seed] Upserting students…')
  for (const s of STUDENTS) {
    const existing = await Student.findOne({ email: s.email })
    if (existing) {
      console.log(`  [SKIP] ${s.email} already exists`)
      continue
    }
    await Student.create({
      name:    s.name,
      email:   s.email,
      regNo:   s.regNo,    // plain text — model pre-save hook hashes it
      phone:   s.phone,
      classId: s.classId,
      addedBy: 'admin@gmail.com',
    })
    console.log(`  [OK]   ${s.name}  (${s.regNo})`)
  }

  // ── 3. Subjects ─────────────────────────────────────────────────────────────
  console.log('\n[Seed] Upserting subjects…')
  for (const sub of SUBJECTS) {
    await Subject.findOneAndUpdate(
      { code: sub.code },
      { $set: { name: sub.name, assignedFaculty: sub.assignedFaculty } },
      { upsert: true, new: true },
    )
    console.log(`  [OK]   ${sub.code}  ${sub.name}`)
  }

  console.log('\n[Seed] Done. Summary:')
  console.log(`  Users    : ${await User.countDocuments()}`)
  console.log(`  Students : ${await Student.countDocuments()}`)
  console.log(`  Subjects : ${await Subject.countDocuments()}`)

  await mongoose.disconnect()
  console.log('\n[Seed] Disconnected.\n')
}

seed().catch(err => {
  console.error('[Seed] Error:', err)
  process.exit(1)
})
