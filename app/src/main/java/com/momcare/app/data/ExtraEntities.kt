package com.momcare.app.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

// ═══════════════════ 추가 기능 10종 엔티티 ═══════════════════

/** 1. 진통 타이머 */
@Entity(tableName = "contractions", indices = [Index("startTime")])
data class Contraction(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val startTime: Long,
    val endTime: Long? = null,
    /** 1(약함) ~ 5(매우 강함) */
    val intensity: Int = 3
)

/** 2. 태동 카운트 세션 */
@Entity(tableName = "kick_sessions", indices = [Index("startTime")])
data class KickSession(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val startTime: Long,
    val endTime: Long? = null,
    val count: Int = 0,
    val memo: String = ""
)

/** 3. 돌봄 인수인계 노트 (조부모·베이비시터용) */
@Entity(tableName = "handover_notes")
data class HandoverNote(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long? = null,
    val title: String,
    val routine: String = "",
    val food: String = "",
    val sleep: String = "",
    val health: String = "",
    val rules: String = "",
    val emergency: String = "",
    val updatedAt: Long = System.currentTimeMillis()
)

/** 4. 육아 소모품 재고 */
@Entity(tableName = "supplies")
data class Supply(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val emoji: String = "📦",
    val unit: String = "개",
    val stock: Double = 0.0,
    /** 하루 평균 사용량 (소진일 예측) */
    val dailyUse: Double = 0.0,
    /** 이 수량 이하이면 부족 알림 */
    val lowThreshold: Double = 0.0,
    /** 기저귀 관련 항목 (기저귀 표시 설정이 꺼져 있으면 숨김) */
    val diaperRelated: Boolean = false,
    val updatedAt: Long = System.currentTimeMillis()
)

/** 6·7. 범용 체크리스트 (집 안전 점검, 외출 가방 등) */
@Entity(tableName = "checklist_items", indices = [Index("listKey")])
data class ChecklistItem(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val listKey: String,
    val category: String,
    val name: String,
    val checked: Boolean = false,
    val note: String = "",
    val sortOrder: Int = 0
)

/** 8. 아이 습관 루틴 */
@Entity(
    tableName = "habits",
    foreignKeys = [ForeignKey(Child::class, ["id"], ["childId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("childId")]
)
data class Habit(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long,
    val title: String,
    val emoji: String = "✨",
    /** 일주일 목표 횟수 */
    val weeklyGoal: Int = 7,
    /** 달성 시 칭찬 스티커 자동 지급 */
    val giveSticker: Boolean = true,
    val archived: Boolean = false
)

@Entity(
    tableName = "habit_logs",
    foreignKeys = [ForeignKey(Habit::class, ["id"], ["habitId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("habitId"), Index(value = ["habitId", "dayEpoch"], unique = true)]
)
data class HabitLog(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val habitId: Long,
    val dayEpoch: Long
)

/** 9. 그림책 독서 기록 */
@Entity(tableName = "book_logs", indices = [Index("date")])
data class BookLog(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long? = null,
    val title: String,
    val author: String = "",
    val date: Long,
    /** 1 ~ 5 (아이 반응) */
    val rating: Int = 3,
    val minutes: Int = 10,
    val memo: String = ""
)

/** 10. 아이 레시피북 */
@Entity(tableName = "recipes")
data class Recipe(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val category: String = "이유식",
    /** 권장 시작 월령 */
    val fromMonth: Int = 6,
    val ingredients: String = "",
    val steps: String = "",
    val tip: String = "",
    val favorite: Boolean = false,
    val builtIn: Boolean = false
)

// ═══════════════════ DAO ═══════════════════

@Dao
interface PregnancyDao {
    @Query("SELECT * FROM contractions ORDER BY startTime DESC LIMIT :limit")
    fun observeContractions(limit: Int): Flow<List<Contraction>>

    @Upsert
    suspend fun upsertContraction(c: Contraction)

    @Delete
    suspend fun deleteContraction(c: Contraction)

    @Query("DELETE FROM contractions")
    suspend fun clearContractions()

    @Query("SELECT * FROM kick_sessions ORDER BY startTime DESC LIMIT :limit")
    fun observeKicks(limit: Int): Flow<List<KickSession>>

    @Upsert
    suspend fun upsertKick(k: KickSession): Long

    @Delete
    suspend fun deleteKick(k: KickSession)
}

@Dao
interface HandoverDao {
    @Query("SELECT * FROM handover_notes ORDER BY updatedAt DESC")
    fun observeAll(): Flow<List<HandoverNote>>

    @Upsert
    suspend fun upsert(n: HandoverNote)

    @Delete
    suspend fun delete(n: HandoverNote)
}

@Dao
interface SupplyDao {
    @Query("SELECT * FROM supplies ORDER BY name ASC")
    fun observeAll(): Flow<List<Supply>>

    @Query("SELECT COUNT(*) FROM supplies")
    suspend fun count(): Int

    @Upsert
    suspend fun upsert(s: Supply)

    @Insert
    suspend fun insertAll(list: List<Supply>)

    @Delete
    suspend fun delete(s: Supply)
}

@Dao
interface ChecklistDao {
    @Query("SELECT * FROM checklist_items WHERE listKey = :key ORDER BY category ASC, sortOrder ASC, id ASC")
    fun observe(key: String): Flow<List<ChecklistItem>>

    @Query("SELECT COUNT(*) FROM checklist_items WHERE listKey = :key")
    suspend fun count(key: String): Int

    @Insert
    suspend fun insertAll(items: List<ChecklistItem>)

    @Upsert
    suspend fun upsert(i: ChecklistItem)

    @Delete
    suspend fun delete(i: ChecklistItem)

    @Query("UPDATE checklist_items SET checked = 0 WHERE listKey = :key")
    suspend fun resetChecks(key: String)
}

@Dao
interface HabitDao {
    @Query("SELECT * FROM habits WHERE childId = :childId AND archived = 0 ORDER BY id ASC")
    fun observeHabits(childId: Long): Flow<List<Habit>>

    @Query("SELECT habit_logs.* FROM habit_logs INNER JOIN habits ON habits.id = habit_logs.habitId WHERE habits.childId = :childId AND habit_logs.dayEpoch >= :fromDay")
    fun observeLogs(childId: Long, fromDay: Long): Flow<List<HabitLog>>

    @Upsert
    suspend fun upsertHabit(h: Habit)

    @Delete
    suspend fun deleteHabit(h: Habit)

    @Insert
    suspend fun insertLog(l: HabitLog)

    @Query("DELETE FROM habit_logs WHERE habitId = :habitId AND dayEpoch = :day")
    suspend fun deleteLog(habitId: Long, day: Long)
}

@Dao
interface BookDao {
    @Query("SELECT * FROM book_logs ORDER BY date DESC, id DESC")
    fun observeAll(): Flow<List<BookLog>>

    @Upsert
    suspend fun upsert(b: BookLog)

    @Delete
    suspend fun delete(b: BookLog)
}

@Dao
interface RecipeDao {
    @Query("SELECT * FROM recipes ORDER BY favorite DESC, fromMonth ASC, title ASC")
    fun observeAll(): Flow<List<Recipe>>

    @Query("SELECT COUNT(*) FROM recipes WHERE builtIn = 1")
    suspend fun builtInCount(): Int

    @Insert
    suspend fun insertAll(list: List<Recipe>)

    @Upsert
    suspend fun upsert(r: Recipe)

    @Delete
    suspend fun delete(r: Recipe)
}
