import * as bcrypt from 'bcryptjs';
import { db, pool } from './db';
import { users, tournaments, tournamentParticipants } from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database with test accounts and sample tournament...');
  try {
    const saltRounds = 10;
    const coachPasswordHash = await bcrypt.hash('CoachPassword123!', saltRounds);
    const studentPasswordHash = await bcrypt.hash('StudentPassword123!', saltRounds);

    // 1. Seed Coach
    const existingCoach = await db
      .select()
      .from(users)
      .where(eq(users.email, 'coach@koc.com'));

    let coachId: string;

    if (existingCoach.length === 0) {
      const [insertedCoach] = await db
        .insert(users)
        .values({
          email: 'coach@koc.com',
          passwordHash: coachPasswordHash,
          name: 'Coach Fischer',
          role: 'coach',
        })
        .returning({ id: users.id });
      coachId = insertedCoach.id;
      console.log('Seeded coach: coach@koc.com / CoachPassword123!');
    } else {
      coachId = existingCoach[0].id;
      console.log('Coach already exists.');
    }

    // 2. Seed 4 Students
    const studentData = [
      { email: 'alice@koc.com', name: 'Alice Chen' },
      { email: 'bob@koc.com', name: 'Bob Smith' },
      { email: 'charlie@koc.com', name: 'Charlie Brown' },
      { email: 'diana@koc.com', name: 'Diana Prince' },
    ];

    const studentIds: string[] = [];

    for (const student of studentData) {
      const existingStudent = await db
        .select()
        .from(users)
        .where(eq(users.email, student.email));

      if (existingStudent.length === 0) {
        const [insertedStudent] = await db
          .insert(users)
          .values({
            email: student.email,
            passwordHash: studentPasswordHash,
            name: student.name,
            role: 'student',
          })
          .returning({ id: users.id });
        studentIds.push(insertedStudent.id);
        console.log(`Seeded student: ${student.email} / StudentPassword123!`);
      } else {
        studentIds.push(existingStudent[0].id);
        console.log(`Student ${student.email} already exists.`);
      }
    }

    // 3. Seed Default Open Tournament
    const existingTournaments = await db.select().from(tournaments);
    let tournamentId: string;

    if (existingTournaments.length === 0) {
      const [createdTournament] = await db
        .insert(tournaments)
        .values({
          name: 'Kingdom Championship 2026',
          timeControl: '5+0',
          initialTimeSeconds: 300,
          incrementSeconds: 0,
          status: 'open',
          createdBy: coachId,
          startDate: new Date(),
        })
        .returning({ id: tournaments.id });
      tournamentId = createdTournament.id;
      console.log('Seeded tournament: "Kingdom Championship 2026"');
    } else {
      tournamentId = existingTournaments[0].id;
      console.log('Tournament already exists.');
    }

    // 4. Enroll students in the tournament if not already enrolled
    for (const sId of studentIds) {
      const existing = await db
        .select()
        .from(tournamentParticipants)
        .where(eq(tournamentParticipants.userId, sId));

      if (existing.length === 0) {
        await db.insert(tournamentParticipants).values({
          tournamentId,
          userId: sId,
          score: 0,
        });
      }
    }
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
