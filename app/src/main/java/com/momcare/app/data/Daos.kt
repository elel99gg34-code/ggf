package com.momcare.app.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface ChildDao {
    @Query("SELECT * FROM children ORDER BY birthDate ASC")
    fun observeAll(): Flow<List<Child>>

    @Query("SELECT * FROM children ORDER BY birthDate ASC")
    suspend fun getAll(): List<Child>

    @Query("SELECT * FROM children WHERE id = :id")
    suspend fun get(id: Long): Child?

    @Insert
    suspend fun insert(child: Child): Long

    @Upsert
    suspend fun upsert(child: Child)

    @Delete
    suspend fun delete(child: Child)
}

@Dao
interface GrowthDao {
    @Query("SELECT * FROM growth_records WHERE childId = :childId ORDER BY date DESC")
    fun observe(childId: Long): Flow<List<GrowthRecord>>

    @Upsert
    suspend fun upsert(record: GrowthRecord)

    @Delete
    suspend fun delete(record: GrowthRecord)
}

@Dao
interface VaccineDao {
    @Query("SELECT * FROM vaccine_records WHERE childId = :childId")
    fun observe(childId: Long): Flow<List<VaccineRecord>>

    @Upsert
    suspend fun upsert(record: VaccineRecord)

    @Query("DELETE FROM vaccine_records WHERE childId = :childId AND doseKey = :doseKey")
    suspend fun deleteByKey(childId: Long, doseKey: String)
}

@Dao
interface FeedingDao {
    @Query("SELECT * FROM feeding_logs WHERE childId = :childId ORDER BY time DESC LIMIT :limit")
    fun observeRecent(childId: Long, limit: Int): Flow<List<FeedingLog>>

    @Query("SELECT * FROM feeding_logs WHERE childId = :childId AND time >= :from AND time < :to ORDER BY time DESC")
    fun observeRange(childId: Long, from: Long, to: Long): Flow<List<FeedingLog>>

    @Query("SELECT * FROM feeding_logs WHERE childId = :childId AND time >= :from AND time < :to ORDER BY time DESC")
    suspend fun getRange(childId: Long, from: Long, to: Long): List<FeedingLog>

    @Upsert
    suspend fun upsert(log: FeedingLog)

    @Delete
    suspend fun delete(log: FeedingLog)
}

@Dao
interface SolidFoodDao {
    @Query("SELECT * FROM solid_food_logs WHERE childId = :childId ORDER BY time DESC LIMIT :limit")
    fun observeRecent(childId: Long, limit: Int): Flow<List<SolidFoodLog>>

    @Query("SELECT DISTINCT foodName FROM solid_food_logs WHERE childId = :childId")
    fun observeTriedFoods(childId: Long): Flow<List<String>>

    @Upsert
    suspend fun upsert(log: SolidFoodLog)

    @Delete
    suspend fun delete(log: SolidFoodLog)
}

@Dao
interface SleepDao {
    @Query("SELECT * FROM sleep_logs WHERE childId = :childId ORDER BY startTime DESC LIMIT :limit")
    fun observeRecent(childId: Long, limit: Int): Flow<List<SleepLog>>

    @Query("SELECT * FROM sleep_logs WHERE childId = :childId AND startTime >= :from AND startTime < :to ORDER BY startTime DESC")
    suspend fun getRange(childId: Long, from: Long, to: Long): List<SleepLog>

    @Query("SELECT * FROM sleep_logs WHERE childId = :childId AND endTime IS NULL ORDER BY startTime DESC LIMIT 1")
    fun observeOngoing(childId: Long): Flow<SleepLog?>

    @Upsert
    suspend fun upsert(log: SleepLog)

    @Delete
    suspend fun delete(log: SleepLog)
}

@Dao
interface DiaperDao {
    @Query("SELECT * FROM diaper_logs WHERE childId = :childId ORDER BY time DESC LIMIT :limit")
    fun observeRecent(childId: Long, limit: Int): Flow<List<DiaperLog>>

    @Query("SELECT * FROM diaper_logs WHERE childId = :childId AND time >= :from AND time < :to ORDER BY time DESC")
    suspend fun getRange(childId: Long, from: Long, to: Long): List<DiaperLog>

    @Upsert
    suspend fun upsert(log: DiaperLog)

    @Delete
    suspend fun delete(log: DiaperLog)
}

@Dao
interface HealthDao {
    @Query("SELECT * FROM health_logs WHERE childId = :childId ORDER BY time DESC LIMIT :limit")
    fun observeRecent(childId: Long, limit: Int): Flow<List<HealthLog>>

    @Upsert
    suspend fun upsert(log: HealthLog)

    @Delete
    suspend fun delete(log: HealthLog)
}

@Dao
interface MedicationDao {
    @Query("SELECT * FROM medications WHERE childId = :childId ORDER BY active DESC, startDate DESC")
    fun observe(childId: Long): Flow<List<Medication>>

    @Query("SELECT * FROM medications WHERE active = 1 AND remind = 1")
    suspend fun getAllActiveReminders(): List<Medication>

    @Query("SELECT * FROM medication_logs WHERE childId = :childId AND time >= :from AND time < :to ORDER BY time DESC")
    fun observeLogs(childId: Long, from: Long, to: Long): Flow<List<MedicationLog>>

    @Upsert
    suspend fun upsert(med: Medication): Long

    @Delete
    suspend fun delete(med: Medication)

    @Insert
    suspend fun insertLog(log: MedicationLog)

    @Delete
    suspend fun deleteLog(log: MedicationLog)
}

@Dao
interface AppointmentDao {
    @Query("SELECT * FROM appointments ORDER BY done ASC, time ASC")
    fun observeAll(): Flow<List<Appointment>>

    @Query("SELECT * FROM appointments WHERE time >= :from AND time < :to ORDER BY time ASC")
    fun observeRange(from: Long, to: Long): Flow<List<Appointment>>

    @Query("SELECT * FROM appointments WHERE done = 0 AND time >= :now ORDER BY time ASC LIMIT 1")
    fun observeNext(now: Long): Flow<Appointment?>

    @Upsert
    suspend fun upsert(a: Appointment): Long

    @Delete
    suspend fun delete(a: Appointment)
}

@Dao
interface MilestoneDao {
    @Query("SELECT * FROM milestone_records WHERE childId = :childId")
    fun observe(childId: Long): Flow<List<MilestoneRecord>>

    @Upsert
    suspend fun upsert(r: MilestoneRecord)

    @Query("DELETE FROM milestone_records WHERE childId = :childId AND milestoneKey = :key")
    suspend fun deleteByKey(childId: Long, key: String)
}

@Dao
interface DiaryDao {
    @Query("SELECT * FROM diary_entries ORDER BY date DESC, id DESC")
    fun observeAll(): Flow<List<DiaryEntry>>

    @Query("SELECT COUNT(*) FROM diary_entries")
    fun observeCount(): Flow<Int>

    @Upsert
    suspend fun upsert(e: DiaryEntry)

    @Delete
    suspend fun delete(e: DiaryEntry)
}

@Dao
interface AnniversaryDao {
    @Query("SELECT * FROM anniversaries ORDER BY date ASC")
    fun observeAll(): Flow<List<Anniversary>>

    @Upsert
    suspend fun upsert(a: Anniversary)

    @Delete
    suspend fun delete(a: Anniversary)
}

@Dao
interface TodoDao {
    @Query("SELECT * FROM todo_items ORDER BY done ASC, priority DESC, dueDate ASC, createdAt DESC")
    fun observeAll(): Flow<List<TodoItem>>

    @Query("SELECT COUNT(*) FROM todo_items WHERE done = 0")
    fun observeOpenCount(): Flow<Int>

    @Upsert
    suspend fun upsert(t: TodoItem)

    @Delete
    suspend fun delete(t: TodoItem)

    @Query("DELETE FROM todo_items WHERE done = 1")
    suspend fun clearDone()
}

@Dao
interface ShoppingDao {
    @Query("SELECT * FROM shopping_items ORDER BY checked ASC, category ASC, id DESC")
    fun observeAll(): Flow<List<ShoppingItem>>

    @Upsert
    suspend fun upsert(s: ShoppingItem)

    @Delete
    suspend fun delete(s: ShoppingItem)

    @Query("DELETE FROM shopping_items WHERE checked = 1")
    suspend fun clearChecked()
}

@Dao
interface MealPlanDao {
    @Query("SELECT * FROM meal_plans")
    fun observeAll(): Flow<List<MealPlan>>

    @Upsert
    suspend fun upsert(m: MealPlan)

    @Query("DELETE FROM meal_plans WHERE dayOfWeek = :day AND mealType = :type")
    suspend fun deleteSlot(day: Int, type: MealType)

    @Query("DELETE FROM meal_plans")
    suspend fun clearAll()
}

@Dao
interface ExpenseDao {
    @Query("SELECT * FROM expenses WHERE date >= :from AND date < :to ORDER BY date DESC, id DESC")
    fun observeRange(from: Long, to: Long): Flow<List<Expense>>

    @Query("SELECT * FROM expenses WHERE date >= :from AND date < :to")
    suspend fun getRange(from: Long, to: Long): List<Expense>

    @Upsert
    suspend fun upsert(e: Expense)

    @Delete
    suspend fun delete(e: Expense)
}

@Dao
interface FamilyEventDao {
    @Query("SELECT * FROM family_events WHERE startTime >= :from AND startTime < :to ORDER BY startTime ASC")
    fun observeRange(from: Long, to: Long): Flow<List<FamilyEvent>>

    @Query("SELECT * FROM family_events WHERE startTime >= :now ORDER BY startTime ASC LIMIT 5")
    fun observeUpcoming(now: Long): Flow<List<FamilyEvent>>

    @Upsert
    suspend fun upsert(e: FamilyEvent): Long

    @Delete
    suspend fun delete(e: FamilyEvent)
}

@Dao
interface AllergyDao {
    @Query("SELECT * FROM allergies WHERE childId = :childId ORDER BY severity DESC, allergen ASC")
    fun observe(childId: Long): Flow<List<Allergy>>

    @Upsert
    suspend fun upsert(a: Allergy)

    @Delete
    suspend fun delete(a: Allergy)
}

@Dao
interface EmergencyContactDao {
    @Query("SELECT * FROM emergency_contacts ORDER BY name ASC")
    fun observeAll(): Flow<List<EmergencyContact>>

    @Upsert
    suspend fun upsert(c: EmergencyContact)

    @Delete
    suspend fun delete(c: EmergencyContact)
}

@Dao
interface MoodDao {
    @Query("SELECT * FROM mood_logs ORDER BY dayEpoch DESC LIMIT :limit")
    fun observeRecent(limit: Int): Flow<List<MoodLog>>

    @Query("SELECT * FROM mood_logs WHERE dayEpoch = :day LIMIT 1")
    suspend fun getDay(day: Long): MoodLog?

    @Upsert
    suspend fun upsert(m: MoodLog)

    @Delete
    suspend fun delete(m: MoodLog)

    @Query("SELECT * FROM epds_results ORDER BY date DESC")
    fun observeEpds(): Flow<List<EpdsResult>>

    @Insert
    suspend fun insertEpds(r: EpdsResult)

    @Delete
    suspend fun deleteEpds(r: EpdsResult)
}

@Dao
interface SelfCareDao {
    @Query("SELECT * FROM self_care_days ORDER BY dayEpoch DESC LIMIT :limit")
    fun observeRecent(limit: Int): Flow<List<SelfCareDay>>

    @Query("SELECT * FROM self_care_days WHERE dayEpoch = :day LIMIT 1")
    suspend fun getDay(day: Long): SelfCareDay?

    @Upsert
    suspend fun upsert(d: SelfCareDay)
}

@Dao
interface GearDao {
    @Query("SELECT * FROM gear_items ORDER BY category ASC, checked ASC, id ASC")
    fun observeAll(): Flow<List<GearItem>>

    @Query("SELECT COUNT(*) FROM gear_items")
    suspend fun count(): Int

    @Insert
    suspend fun insertAll(items: List<GearItem>)

    @Upsert
    suspend fun upsert(g: GearItem)

    @Delete
    suspend fun delete(g: GearItem)
}

@Dao
interface SchoolDao {
    @Query("SELECT * FROM school_items WHERE childId = :childId ORDER BY dayOfWeek ASC, timeText ASC, id ASC")
    fun observe(childId: Long): Flow<List<SchoolItem>>

    @Upsert
    suspend fun upsert(s: SchoolItem)

    @Delete
    suspend fun delete(s: SchoolItem)

    @Query("UPDATE school_items SET checked = 0 WHERE childId = :childId AND kind = 'SUPPLY'")
    suspend fun uncheckSupplies(childId: Long)
}

@Dao
interface RewardDao {
    @Query("SELECT * FROM sticker_logs WHERE childId = :childId ORDER BY date DESC, id DESC")
    fun observeStickers(childId: Long): Flow<List<StickerLog>>

    @Query("SELECT * FROM rewards WHERE childId = :childId ORDER BY redeemedAt IS NOT NULL, cost ASC")
    fun observeRewards(childId: Long): Flow<List<Reward>>

    @Insert
    suspend fun insertSticker(s: StickerLog)

    @Delete
    suspend fun deleteSticker(s: StickerLog)

    @Upsert
    suspend fun upsertReward(r: Reward)

    @Delete
    suspend fun deleteReward(r: Reward)
}

@Dao
interface CounselDao {
    @Query("SELECT * FROM counsel_progress")
    fun observeProgress(): Flow<List<CounselProgress>>

    @Query("SELECT * FROM counsel_progress WHERE skillId = :skillId LIMIT 1")
    suspend fun getProgress(skillId: String): CounselProgress?

    @Upsert
    suspend fun upsertProgress(p: CounselProgress)

    @Query("SELECT * FROM counsel_alarms ORDER BY hour ASC, minute ASC")
    fun observeAlarms(): Flow<List<CounselAlarm>>

    @Query("SELECT * FROM counsel_alarms WHERE enabled = 1")
    suspend fun getEnabledAlarms(): List<CounselAlarm>

    @Query("SELECT * FROM counsel_alarms WHERE id = :id")
    suspend fun getAlarm(id: Long): CounselAlarm?

    @Upsert
    suspend fun upsertAlarm(a: CounselAlarm): Long

    @Delete
    suspend fun deleteAlarm(a: CounselAlarm)

    @Query("SELECT * FROM counsel_checkins ORDER BY dayEpoch DESC LIMIT :limit")
    fun observeCheckins(limit: Int): Flow<List<CounselCheckin>>

    @Upsert
    suspend fun upsertCheckin(c: CounselCheckin)

    @Query("SELECT * FROM counsel_journals ORDER BY date DESC, id DESC")
    fun observeJournals(): Flow<List<CounselJournal>>

    @Upsert
    suspend fun upsertJournal(j: CounselJournal)

    @Delete
    suspend fun deleteJournal(j: CounselJournal)
}
