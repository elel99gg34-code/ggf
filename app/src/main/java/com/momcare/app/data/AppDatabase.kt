package com.momcare.app.data

import android.content.Context
import android.content.SharedPreferences
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

@Database(
    entities = [
        Child::class, GrowthRecord::class, VaccineRecord::class, FeedingLog::class,
        SolidFoodLog::class, SleepLog::class, DiaperLog::class, HealthLog::class,
        Medication::class, MedicationLog::class, Appointment::class, MilestoneRecord::class,
        DiaryEntry::class, Anniversary::class, TodoItem::class, ShoppingItem::class,
        MealPlan::class, Expense::class, FamilyEvent::class, Allergy::class,
        EmergencyContact::class, MoodLog::class, EpdsResult::class, SelfCareDay::class,
        GearItem::class, SchoolItem::class, StickerLog::class, Reward::class,
        CounselProgress::class, CounselAlarm::class, CounselCheckin::class, CounselJournal::class,
        Contraction::class, KickSession::class, HandoverNote::class, Supply::class,
        ChecklistItem::class, Habit::class, HabitLog::class, BookLog::class, Recipe::class
    ],
    version = 1,
    // 스키마를 app/schemas 에 내보내 이후 버전에서 마이그레이션(AutoMigration) 작성에 사용
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun childDao(): ChildDao
    abstract fun growthDao(): GrowthDao
    abstract fun vaccineDao(): VaccineDao
    abstract fun feedingDao(): FeedingDao
    abstract fun solidFoodDao(): SolidFoodDao
    abstract fun sleepDao(): SleepDao
    abstract fun diaperDao(): DiaperDao
    abstract fun healthDao(): HealthDao
    abstract fun medicationDao(): MedicationDao
    abstract fun appointmentDao(): AppointmentDao
    abstract fun milestoneDao(): MilestoneDao
    abstract fun diaryDao(): DiaryDao
    abstract fun anniversaryDao(): AnniversaryDao
    abstract fun todoDao(): TodoDao
    abstract fun shoppingDao(): ShoppingDao
    abstract fun mealPlanDao(): MealPlanDao
    abstract fun expenseDao(): ExpenseDao
    abstract fun familyEventDao(): FamilyEventDao
    abstract fun allergyDao(): AllergyDao
    abstract fun emergencyContactDao(): EmergencyContactDao
    abstract fun moodDao(): MoodDao
    abstract fun selfCareDao(): SelfCareDao
    abstract fun gearDao(): GearDao
    abstract fun schoolDao(): SchoolDao
    abstract fun rewardDao(): RewardDao
    abstract fun counselDao(): CounselDao
    abstract fun pregnancyDao(): PregnancyDao
    abstract fun handoverDao(): HandoverDao
    abstract fun supplyDao(): SupplyDao
    abstract fun checklistDao(): ChecklistDao
    abstract fun habitDao(): HabitDao
    abstract fun bookDao(): BookDao
    abstract fun recipeDao(): RecipeDao

    companion object {
        const val NAME = "momcare.db"

        fun build(context: Context): AppDatabase =
            // 엄마의 기록이 지워지지 않도록 파괴적 마이그레이션은 쓰지 않는다.
            // 버전을 올릴 때는 반드시 Migration 또는 AutoMigration 을 추가할 것.
            Room.databaseBuilder(context.applicationContext, AppDatabase::class.java, NAME)
                .build()
    }
}

/** 간단한 설정 저장소 (SharedPreferences + StateFlow) */
class Prefs(context: Context) {
    private val sp: SharedPreferences =
        context.getSharedPreferences("momcare_prefs", Context.MODE_PRIVATE)

    private val _selectedChildId = MutableStateFlow(sp.getLong(KEY_CHILD, -1L))
    val selectedChildId: StateFlow<Long> = _selectedChildId.asStateFlow()

    private val _momName = MutableStateFlow(sp.getString(KEY_MOM, "엄마") ?: "엄마")
    val momName: StateFlow<String> = _momName.asStateFlow()

    private val _notificationsOn = MutableStateFlow(sp.getBoolean(KEY_NOTI, true))
    val notificationsOn: StateFlow<Boolean> = _notificationsOn.asStateFlow()

    private val _waterGoal = MutableStateFlow(sp.getInt(KEY_WATER, 8))
    val waterGoal: StateFlow<Int> = _waterGoal.asStateFlow()

    private val _useCelsius = MutableStateFlow(sp.getBoolean(KEY_CELSIUS, true))
    val useCelsius: StateFlow<Boolean> = _useCelsius.asStateFlow()

    private val _unlocked = MutableStateFlow(sp.getBoolean(KEY_UNLOCKED, false))
    val unlocked: StateFlow<Boolean> = _unlocked.asStateFlow()

    /** 비밀번호를 1회 맞게 입력하면 영구적으로 잠금 해제 상태를 저장한다 */
    fun setUnlocked(on: Boolean) {
        sp.edit().putBoolean(KEY_UNLOCKED, on).apply()
        _unlocked.value = on
    }

    // ── 기능 표시(비공개) 설정: 모두 기본값 false = 숨김 ──

    private val _showChild = MutableStateFlow(sp.getBoolean(KEY_SHOW_CHILD, false))
    /** 아이·육아 관련 기능 표시 */
    val showChild: StateFlow<Boolean> = _showChild.asStateFlow()

    private val _showPregnancy = MutableStateFlow(sp.getBoolean(KEY_SHOW_PREGNANCY, false))
    /** 임신·출산 관련 기능 표시 */
    val showPregnancy: StateFlow<Boolean> = _showPregnancy.asStateFlow()

    private val _showDiaper = MutableStateFlow(sp.getBoolean(KEY_SHOW_DIAPER, false))
    /** 기저귀 관련 기능 표시 (아이 기능이 켜져 있을 때만 의미 있음) */
    val showDiaper: StateFlow<Boolean> = _showDiaper.asStateFlow()

    fun setShowChild(on: Boolean) {
        sp.edit().putBoolean(KEY_SHOW_CHILD, on).apply()
        _showChild.value = on
    }

    fun setShowPregnancy(on: Boolean) {
        sp.edit().putBoolean(KEY_SHOW_PREGNANCY, on).apply()
        _showPregnancy.value = on
    }

    fun setShowDiaper(on: Boolean) {
        sp.edit().putBoolean(KEY_SHOW_DIAPER, on).apply()
        _showDiaper.value = on
    }

    /** 출산 예정일 (0 이면 미설정) */
    private val _dueDate = MutableStateFlow(sp.getLong(KEY_DUE_DATE, 0L))
    val dueDate: StateFlow<Long> = _dueDate.asStateFlow()

    fun setDueDate(ms: Long) {
        sp.edit().putLong(KEY_DUE_DATE, ms).apply()
        _dueDate.value = ms
    }

    fun setSelectedChild(id: Long) {
        sp.edit().putLong(KEY_CHILD, id).apply()
        _selectedChildId.value = id
    }

    fun setMomName(name: String) {
        sp.edit().putString(KEY_MOM, name).apply()
        _momName.value = name
    }

    fun setNotificationsOn(on: Boolean) {
        sp.edit().putBoolean(KEY_NOTI, on).apply()
        _notificationsOn.value = on
    }

    fun setWaterGoal(cups: Int) {
        sp.edit().putInt(KEY_WATER, cups).apply()
        _waterGoal.value = cups
    }

    fun setUseCelsius(on: Boolean) {
        sp.edit().putBoolean(KEY_CELSIUS, on).apply()
        _useCelsius.value = on
    }

    fun getInt(key: String, def: Int) = sp.getInt(key, def)
    fun putInt(key: String, v: Int) = sp.edit().putInt(key, v).apply()
    fun getLong(key: String, def: Long) = sp.getLong(key, def)
    fun putLong(key: String, v: Long) = sp.edit().putLong(key, v).apply()

    companion object {
        private const val KEY_CHILD = "selected_child"
        private const val KEY_MOM = "mom_name"
        private const val KEY_NOTI = "notifications_on"
        private const val KEY_WATER = "water_goal"
        private const val KEY_CELSIUS = "use_celsius"
        private const val KEY_UNLOCKED = "app_unlocked"
        private const val KEY_SHOW_DIAPER = "show_diaper"
        private const val KEY_SHOW_CHILD = "show_child"
        private const val KEY_SHOW_PREGNANCY = "show_pregnancy"
        private const val KEY_DUE_DATE = "due_date"
    }
}

/** 수동 DI 컨테이너 */
class AppContainer(context: Context) {
    val db: AppDatabase = AppDatabase.build(context)
    val prefs: Prefs = Prefs(context)
    val session = com.momcare.app.data.remote.SessionStore(context)
    val api = com.momcare.app.data.remote.ApiClient { session.serverUrl.value }
    val backup = com.momcare.app.data.remote.BackupManager(context)
}
