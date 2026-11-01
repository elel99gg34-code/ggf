package com.momcare.app.data

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

// ───────────────────────── Enums ─────────────────────────

enum class Gender(val label: String, val emoji: String) {
    GIRL("여아", "👧"), BOY("남아", "👦"), UNKNOWN("미정", "👶")
}

enum class FeedType(val label: String, val emoji: String) {
    BREAST_LEFT("모유(왼쪽)", "🤱"),
    BREAST_RIGHT("모유(오른쪽)", "🤱"),
    PUMPED("유축 수유", "🍼"),
    FORMULA("분유", "🍼"),
    WATER("물", "💧")
}

enum class FoodReaction(val label: String, val emoji: String) {
    GOOD("잘 먹음", "😋"), SOSO("보통", "🙂"), REFUSED("거부", "🙅"), ALLERGY("이상 반응", "⚠️")
}

enum class SleepType(val label: String, val emoji: String) {
    NIGHT("밤잠", "🌙"), NAP("낮잠", "☀️")
}

enum class DiaperType(val label: String, val emoji: String) {
    PEE("소변", "💧"), POO("대변", "💩"), BOTH("소변+대변", "💦"), DRY("깨끗함", "✨")
}

enum class StoolState(val label: String) {
    NORMAL("정상"), LOOSE("묽음"), HARD("단단함"), GREEN("녹색"), BLOODY("혈변 의심"), WHITE("흰색/회색")
}

enum class Severity(val label: String, val emoji: String) {
    MILD("가벼움", "🟢"), MODERATE("보통", "🟡"), SEVERE("심각", "🔴")
}

enum class Priority(val label: String, val emoji: String) {
    LOW("낮음", "⚪"), NORMAL("보통", "🔵"), HIGH("높음", "🔴")
}

enum class ExpenseCategory(val label: String, val emoji: String) {
    DIAPER("기저귀·위생", "🧷"), FORMULA("분유·간식", "🍼"), FOOD("이유식·식비", "🥣"),
    CLOTHES("의류·신발", "👕"), TOY("장난감·도서", "🧸"), MEDICAL("병원·약", "🏥"),
    EDUCATION("교육·보육", "📚"), GEAR("육아용품", "🛒"), ETC("기타", "📦")
}

enum class MealType(val label: String, val emoji: String) {
    BREAKFAST("아침", "🌅"), LUNCH("점심", "🍱"), DINNER("저녁", "🌙"), SNACK("간식", "🍪")
}

enum class ShoppingCategory(val label: String, val emoji: String) {
    FOOD("식품", "🥬"), BABY("아기용품", "🍼"), HOME("생활용품", "🧻"), HEALTH("건강·약", "💊"), ETC("기타", "📦")
}

enum class SchoolItemKind(val label: String) {
    SUPPLY("준비물"), TIMETABLE("시간표")
}

enum class FamilyColor(val label: String, val argb: Long) {
    PINK("분홍", 0xFFF2708E), BLUE("파랑", 0xFF5B9BD5), GREEN("초록", 0xFF6BBF8A),
    ORANGE("주황", 0xFFF5A25D), PURPLE("보라", 0xFF9B7FD1)
}

// ───────────────────────── Entities ─────────────────────────

@Entity(tableName = "children")
data class Child(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val birthDate: Long,
    val gender: Gender = Gender.UNKNOWN,
    val bloodType: String = "",
    val birthWeightKg: Double? = null,
    val birthHeightCm: Double? = null,
    val colorIndex: Int = 0,
    val memo: String = "",
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "growth_records",
    foreignKeys = [ForeignKey(Child::class, ["id"], ["childId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("childId")]
)
data class GrowthRecord(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long,
    val date: Long,
    val heightCm: Double? = null,
    val weightKg: Double? = null,
    val headCm: Double? = null,
    val memo: String = ""
)

@Entity(
    tableName = "vaccine_records",
    foreignKeys = [ForeignKey(Child::class, ["id"], ["childId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("childId"), Index(value = ["childId", "doseKey"], unique = true)]
)
data class VaccineRecord(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long,
    /** "vaccineCode#doseIndex" 형태의 키 */
    val doseKey: String,
    val doneDate: Long,
    val hospital: String = "",
    val memo: String = ""
)

@Entity(
    tableName = "feeding_logs",
    foreignKeys = [ForeignKey(Child::class, ["id"], ["childId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("childId"), Index("time")]
)
data class FeedingLog(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long,
    val time: Long,
    val type: FeedType,
    val amountMl: Int = 0,
    val durationMin: Int = 0,
    val memo: String = ""
)

@Entity(
    tableName = "solid_food_logs",
    foreignKeys = [ForeignKey(Child::class, ["id"], ["childId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("childId"), Index("time")]
)
data class SolidFoodLog(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long,
    val time: Long,
    val foodName: String,
    val stage: String = "",
    val amountText: String = "",
    val reaction: FoodReaction = FoodReaction.GOOD,
    val isFirstTry: Boolean = false,
    val memo: String = ""
)

@Entity(
    tableName = "sleep_logs",
    foreignKeys = [ForeignKey(Child::class, ["id"], ["childId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("childId"), Index("startTime")]
)
data class SleepLog(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long,
    val startTime: Long,
    val endTime: Long? = null,
    val type: SleepType = SleepType.NAP,
    /** 1(뒤척임 많음) ~ 5(꿀잠) */
    val quality: Int = 3,
    val memo: String = ""
)

@Entity(
    tableName = "diaper_logs",
    foreignKeys = [ForeignKey(Child::class, ["id"], ["childId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("childId"), Index("time")]
)
data class DiaperLog(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long,
    val time: Long,
    val type: DiaperType,
    val stool: StoolState = StoolState.NORMAL,
    val rash: Boolean = false,
    val memo: String = ""
)

@Entity(
    tableName = "health_logs",
    foreignKeys = [ForeignKey(Child::class, ["id"], ["childId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("childId"), Index("time")]
)
data class HealthLog(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long,
    val time: Long,
    val tempC: Double? = null,
    /** 쉼표로 구분된 증상 목록 */
    val symptoms: String = "",
    val memo: String = ""
)

@Entity(
    tableName = "medications",
    foreignKeys = [ForeignKey(Child::class, ["id"], ["childId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("childId")]
)
data class Medication(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long,
    val name: String,
    val dose: String = "",
    /** "08:00,20:00" 형태 */
    val times: String = "08:00",
    val startDate: Long,
    val endDate: Long? = null,
    val remind: Boolean = true,
    val active: Boolean = true,
    val memo: String = ""
)

@Entity(
    tableName = "medication_logs",
    foreignKeys = [ForeignKey(Medication::class, ["id"], ["medicationId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("medicationId"), Index("childId"), Index("time")]
)
data class MedicationLog(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val medicationId: Long,
    val childId: Long,
    val time: Long,
    val note: String = ""
)

@Entity(tableName = "appointments", indices = [Index("time")])
data class Appointment(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long? = null,
    val title: String,
    val hospital: String = "",
    val department: String = "",
    val time: Long,
    val remindMinutes: Int = 60,
    val done: Boolean = false,
    val memo: String = ""
)

@Entity(
    tableName = "milestone_records",
    foreignKeys = [ForeignKey(Child::class, ["id"], ["childId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("childId"), Index(value = ["childId", "milestoneKey"], unique = true)]
)
data class MilestoneRecord(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long,
    val milestoneKey: String,
    val achievedDate: Long
)

@Entity(tableName = "diary_entries", indices = [Index("date")])
data class DiaryEntry(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long? = null,
    val date: Long,
    val title: String,
    val content: String,
    val moodEmoji: String = "😊",
    val photoPath: String? = null
)

@Entity(tableName = "anniversaries")
data class Anniversary(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long? = null,
    val title: String,
    val date: Long,
    val repeatYearly: Boolean = true,
    val emoji: String = "🎉"
)

@Entity(tableName = "todo_items")
data class TodoItem(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val dueDate: Long? = null,
    val done: Boolean = false,
    val priority: Priority = Priority.NORMAL,
    val assignee: String = "",
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "shopping_items")
data class ShoppingItem(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val quantity: String = "1",
    val category: ShoppingCategory = ShoppingCategory.ETC,
    val price: Int? = null,
    val checked: Boolean = false
)

@Entity(tableName = "meal_plans", indices = [Index(value = ["dayOfWeek", "mealType"], unique = true)])
data class MealPlan(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    /** 1=월 ... 7=일 */
    val dayOfWeek: Int,
    val mealType: MealType,
    val menu: String
)

@Entity(tableName = "expenses", indices = [Index("date")])
data class Expense(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long? = null,
    val date: Long,
    val category: ExpenseCategory,
    val title: String,
    val amount: Int,
    val memo: String = ""
)

@Entity(tableName = "family_events", indices = [Index("startTime")])
data class FamilyEvent(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val startTime: Long,
    val allDay: Boolean = false,
    val color: FamilyColor = FamilyColor.PINK,
    val remindMinutes: Int = 0,
    val memo: String = ""
)

@Entity(
    tableName = "allergies",
    foreignKeys = [ForeignKey(Child::class, ["id"], ["childId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("childId")]
)
data class Allergy(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long,
    val allergen: String,
    val severity: Severity = Severity.MILD,
    val reaction: String = "",
    val discoveredDate: Long? = null,
    val memo: String = ""
)

@Entity(tableName = "emergency_contacts")
data class EmergencyContact(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val relation: String = "",
    val phone: String,
    val memo: String = ""
)

@Entity(tableName = "mood_logs", indices = [Index(value = ["dayEpoch"], unique = true)])
data class MoodLog(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val dayEpoch: Long,
    /** 1(힘듦) ~ 5(최고) */
    val mood: Int,
    val energy: Int = 3,
    val tags: String = "",
    val note: String = ""
)

@Entity(tableName = "epds_results")
data class EpdsResult(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val date: Long,
    val score: Int,
    val answers: String,
    val selfHarmFlag: Boolean = false
)

@Entity(tableName = "self_care_days", indices = [Index(value = ["dayEpoch"], unique = true)])
data class SelfCareDay(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val dayEpoch: Long,
    val waterCups: Int = 0,
    val vitamin: Boolean = false,
    val stretch: Boolean = false,
    val meTimeMin: Int = 0,
    val sleepHours: Double = 0.0,
    val walked: Boolean = false
)

@Entity(tableName = "gear_items")
data class GearItem(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val category: String,
    val name: String,
    val quantity: Int = 1,
    val checked: Boolean = false,
    val memo: String = ""
)

@Entity(
    tableName = "school_items",
    foreignKeys = [ForeignKey(Child::class, ["id"], ["childId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("childId")]
)
data class SchoolItem(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long,
    val kind: SchoolItemKind,
    /** 1=월 ... 7=일 (0이면 요일 무관) */
    val dayOfWeek: Int = 0,
    val title: String,
    val timeText: String = "",
    val checked: Boolean = false
)

@Entity(
    tableName = "sticker_logs",
    foreignKeys = [ForeignKey(Child::class, ["id"], ["childId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("childId")]
)
data class StickerLog(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long,
    val date: Long,
    val reason: String,
    val count: Int = 1,
    val emoji: String = "⭐"
)

@Entity(
    tableName = "rewards",
    foreignKeys = [ForeignKey(Child::class, ["id"], ["childId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("childId")]
)
data class Reward(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val childId: Long,
    val title: String,
    val cost: Int,
    val redeemedAt: Long? = null
)

/** 상담 스킬 학습/연습 진행도 */
@Entity(tableName = "counsel_progress", indices = [Index(value = ["skillId"], unique = true)])
data class CounselProgress(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val skillId: String,
    val learned: Boolean = false,
    val practiceCount: Int = 0,
    val lastPracticed: Long? = null,
    val favorite: Boolean = false,
    val myNote: String = ""
)

/** 상담 스킬 알람 (알람처럼 매일 정해진 시각에 스킬 알림) */
@Entity(tableName = "counsel_alarms")
data class CounselAlarm(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val hour: Int,
    val minute: Int,
    val label: String = "오늘의 상담 스킬",
    /** 비트마스크: 월=1, 화=2, 수=4 ... 일=64. 127이면 매일 */
    val daysMask: Int = 127,
    /** 빈 문자열이면 순서대로 자동, 아니면 특정 skillId 고정 */
    val fixedSkillId: String = "",
    val category: String = "",
    val enabled: Boolean = true
)

/** 알람 울림 기록 (연속 학습 일수 계산용) */
@Entity(tableName = "counsel_checkins", indices = [Index(value = ["dayEpoch"], unique = true)])
data class CounselCheckin(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val dayEpoch: Long,
    val skillId: String,
    val rating: Int = 0
)

/** 상담 일지: 실제 상담(아이/배우자/선생님/의사)을 준비하고 돌아본 기록 */
@Entity(tableName = "counsel_journals", indices = [Index("date")])
data class CounselJournal(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val date: Long,
    val childId: Long? = null,
    val target: String,
    val topic: String,
    val goal: String = "",
    val whatWentWell: String = "",
    val nextTime: String = "",
    val skillIds: String = "",
    val satisfaction: Int = 3
)
