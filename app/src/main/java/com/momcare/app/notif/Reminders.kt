package com.momcare.app.notif

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.momcare.app.MainActivity
import com.momcare.app.MomCareApp
import com.momcare.app.R
import com.momcare.app.content.CounselContent
import com.momcare.app.data.CounselAlarm
import com.momcare.app.data.CounselCheckin
import com.momcare.app.ui.nav.Features
import com.momcare.app.ui.nav.Visibility
import com.momcare.app.util.Dt
import java.util.concurrent.TimeUnit

object Reminders {
    const val CHANNEL_GENERAL = "momcare_general"
    const val CHANNEL_COUNSEL = "momcare_counsel"
    const val EXTRA_ROUTE = "route"

    fun ensureChannels(ctx: Context) {
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_GENERAL, "육아 알림", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "투약, 병원 예약, 일정 알림"
            }
        )
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_COUNSEL, "상담 스킬 알람", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "정해진 시간에 오늘의 상담 스킬을 알려줘요"
                enableVibration(true)
            }
        )
    }

    // ───────── 일회성 알림 ─────────

    fun scheduleOnce(ctx: Context, key: String, title: String, text: String, atMillis: Long, route: String = "") {
        val delay = atMillis - System.currentTimeMillis()
        if (delay <= 0) return
        val data = Data.Builder()
            .putString("title", title)
            .putString("text", text)
            .putString("route", route)
            .build()
        val req = OneTimeWorkRequestBuilder<NotifyWorker>()
            .setInitialDelay(delay, TimeUnit.MILLISECONDS)
            .setInputData(data)
            .addTag(key)
            .build()
        WorkManager.getInstance(ctx).enqueueUniqueWork(key, ExistingWorkPolicy.REPLACE, req)
    }

    // ───────── 매일 반복 알림 (투약 등) ─────────

    /**
     * @param fromWorker 알림 워커 안에서 다음 날을 예약할 때 true.
     *   실행 중인 자기 자신을 REPLACE 로 취소하지 않도록 APPEND_OR_REPLACE 로 이어 붙인다.
     */
    fun scheduleDaily(
        ctx: Context, key: String, title: String, text: String,
        hour: Int, minute: Int, untilMillis: Long = 0L, route: String = "",
        fromWorker: Boolean = false
    ) {
        val next = Dt.nextOccurrence(hour, minute, 127) ?: return
        if (untilMillis > 0 && next > untilMillis) return
        val data = Data.Builder()
            .putString("key", key)
            .putString("title", title)
            .putString("text", text)
            .putString("route", route)
            .putInt("hour", hour)
            .putInt("minute", minute)
            .putLong("until", untilMillis)
            .build()
        val req = OneTimeWorkRequestBuilder<DailyWorker>()
            .setInitialDelay(next - System.currentTimeMillis(), TimeUnit.MILLISECONDS)
            .setInputData(data)
            .addTag(key)
            .build()
        WorkManager.getInstance(ctx).enqueueUniqueWork(key, policy(fromWorker), req)
    }

    private fun policy(fromWorker: Boolean) =
        if (fromWorker) ExistingWorkPolicy.APPEND_OR_REPLACE else ExistingWorkPolicy.REPLACE

    fun cancel(ctx: Context, key: String) {
        WorkManager.getInstance(ctx).cancelUniqueWork(key)
    }

    fun medKey(medId: Long, index: Int) = "med_${medId}_$index"
    fun apptKey(id: Long) = "appt_$id"
    fun eventKey(id: Long) = "event_$id"
    fun counselKey(id: Long) = "counsel_alarm_$id"

    // ───────── 상담 스킬 알람 ─────────

    fun scheduleCounselAlarm(ctx: Context, alarm: CounselAlarm, fromWorker: Boolean = false) {
        if (!fromWorker) cancel(ctx, counselKey(alarm.id))
        if (!alarm.enabled) return
        val next = Dt.nextOccurrence(alarm.hour, alarm.minute, alarm.daysMask) ?: return
        val data = Data.Builder().putLong("alarmId", alarm.id).build()
        val req = OneTimeWorkRequestBuilder<CounselAlarmWorker>()
            .setInitialDelay(next - System.currentTimeMillis(), TimeUnit.MILLISECONDS)
            .setInputData(data)
            .addTag(counselKey(alarm.id))
            .build()
        WorkManager.getInstance(ctx).enqueueUniqueWork(counselKey(alarm.id), policy(fromWorker), req)
    }

    /** 앱 시작 시 저장된 모든 알람을 다시 등록 */
    suspend fun rescheduleAll(ctx: Context) {
        val container = (ctx.applicationContext as MomCareApp).container
        container.db.counselDao().getEnabledAlarms().forEach { scheduleCounselAlarm(ctx, it) }
        container.db.medicationDao().getAllActiveReminders().forEach { med ->
            val until = med.endDate?.let { Dt.endOfDay(it) } ?: 0L
            med.times.split(",").forEachIndexed { i, t ->
                Dt.parseHm(t)?.let { (h, m) ->
                    scheduleDaily(
                        ctx, medKey(med.id, i), "💊 ${med.name} 먹일 시간이에요",
                        med.dose.ifBlank { "복용 시간입니다" }, h, m, until, "medication"
                    )
                }
            }
        }
    }

    // ───────── 표시 ─────────

    @SuppressLint("MissingPermission")
    fun show(
        ctx: Context, id: Int, channel: String, title: String, text: String,
        route: String = "", bigText: String? = null
    ) {
        val nmc = NotificationManagerCompat.from(ctx)
        if (!nmc.areNotificationsEnabled()) return
        // 비공개(숨김) 상태인 기능의 알림은 표시하지 않는다
        val prefs = (ctx.applicationContext as MomCareApp).container.prefs
        val visibility = Visibility(prefs.showChild.value, prefs.showPregnancy.value, prefs.showDiaper.value)
        if (route.isNotBlank() && !Features.isAllowed(route, visibility)) return
        val intent = Intent(ctx, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_ROUTE, route)
        }
        val pi = PendingIntent.getActivity(
            ctx, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val builder = NotificationCompat.Builder(ctx, channel)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(text)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setContentIntent(pi)
            // 잠금화면에서는 내용을 숨기고 앱 이름만 보여준다
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setPublicVersion(
                NotificationCompat.Builder(ctx, channel)
                    .setSmallIcon(R.drawable.ic_launcher_foreground)
                    .setContentTitle("맘케어 알림")
                    .setContentText("잠금을 해제하면 내용을 볼 수 있어요")
                    .build()
            )
        if (bigText != null) builder.setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
        nmc.notify(id, builder.build())
    }
}

class NotifyWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val title = inputData.getString("title") ?: return Result.success()
        val text = inputData.getString("text") ?: ""
        val route = inputData.getString("route") ?: ""
        Reminders.show(applicationContext, (title + text).hashCode(), Reminders.CHANNEL_GENERAL, title, text, route)
        return Result.success()
    }
}

class DailyWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val key = inputData.getString("key") ?: return Result.success()
        val title = inputData.getString("title") ?: return Result.success()
        val text = inputData.getString("text") ?: ""
        val route = inputData.getString("route") ?: ""
        val hour = inputData.getInt("hour", 9)
        val minute = inputData.getInt("minute", 0)
        val until = inputData.getLong("until", 0L)

        Reminders.show(applicationContext, key.hashCode(), Reminders.CHANNEL_GENERAL, title, text, route)
        // 다음 날 같은 시각에 다시 예약 (체인 방식)
        Reminders.scheduleDaily(applicationContext, key, title, text, hour, minute, until, route, fromWorker = true)
        return Result.success()
    }
}

/** 상담 스킬 알람: 울릴 때마다 오늘의 스킬을 골라 알림으로 보여주고 다음 알람을 다시 예약한다. */
class CounselAlarmWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val id = inputData.getLong("alarmId", -1L)
        if (id < 0) return Result.success()
        val container = (applicationContext as MomCareApp).container
        val dao = container.db.counselDao()
        val alarm = dao.getAlarm(id) ?: return Result.success()
        if (!alarm.enabled) return Result.success()

        val today = Dt.dayEpoch()
        val skill = if (alarm.fixedSkillId.isNotBlank()) {
            CounselContent.skillById(alarm.fixedSkillId)
        } else null
        val chosen = skill ?: CounselContent.dailySkill(today, alarm.category, alarm.id.toInt())

        dao.upsertCheckin(CounselCheckin(dayEpoch = today, skillId = chosen.id))

        val big = buildString {
            append(chosen.summary).append("\n\n")
            append("💬 이렇게 말해보세요\n")
            append(chosen.sayThis.firstOrNull() ?: "")
            append("\n\n🎯 오늘의 미션: ").append(chosen.practice)
        }
        Reminders.show(
            applicationContext,
            ("counsel" + id).hashCode(),
            Reminders.CHANNEL_COUNSEL,
            "${chosen.emoji} ${alarm.label}: ${chosen.title}",
            chosen.summary,
            route = "counsel_skill/${chosen.id}",
            bigText = big
        )
        Reminders.scheduleCounselAlarm(applicationContext, alarm, fromWorker = true)
        return Result.success()
    }
}
