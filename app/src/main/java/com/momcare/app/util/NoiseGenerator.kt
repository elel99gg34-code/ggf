package com.momcare.app.util

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import kotlin.math.PI
import kotlin.math.sin
import kotlin.random.Random

enum class NoiseType(val label: String, val emoji: String, val desc: String) {
    WHITE("화이트 노이즈", "⚪", "모든 주파수가 고르게 섞인 소리"),
    PINK("핑크 노이즈", "🌸", "빗소리처럼 부드러운 소리"),
    BROWN("브라운 노이즈", "🟤", "파도·바람처럼 낮고 깊은 소리"),
    HEARTBEAT("심장 소리", "💓", "엄마 뱃속에서 듣던 박동"),
    SHUSH("쉬~ 소리", "🤫", "달랠 때 쓰는 쉬 소리")
}

/**
 * 오디오 파일 없이 실시간으로 수면용 소리를 합성한다.
 * 별도 스레드에서 AudioTrack 스트리밍으로 재생하며, 시작/정지 시 페이드 처리한다.
 */
class NoiseGenerator {
    private val sampleRate = 22_050
    @Volatile private var running = false
    @Volatile var volume: Float = 0.6f
    private var thread: Thread? = null
    private var track: AudioTrack? = null

    val isPlaying: Boolean get() = running

    fun start(type: NoiseType) {
        stop()
        val minBuf = AudioTrack.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
        val t = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setSampleRate(sampleRate)
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setBufferSizeInBytes(minBuf * 4)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
        track = t
        running = true
        t.play()
        thread = Thread({ loop(t, type) }, "noise-generator").apply { start() }
    }

    fun stop() {
        running = false
        thread?.join(500)
        thread = null
        track?.let { runCatching { it.stop() }; it.release() }
        track = null
    }

    private fun loop(t: AudioTrack, type: NoiseType) {
        val buf = ShortArray(1024)
        val rnd = Random(System.nanoTime())
        // 핑크 노이즈 (Paul Kellet 필터) 상태
        var b0 = 0.0; var b1 = 0.0; var b2 = 0.0; var b3 = 0.0; var b4 = 0.0; var b5 = 0.0; var b6 = 0.0
        var brown = 0.0
        var sampleIndex = 0L
        var fade = 0.0
        while (running) {
            for (i in buf.indices) {
                val white = rnd.nextDouble() * 2 - 1
                val v: Double = when (type) {
                    NoiseType.WHITE -> white * 0.5
                    NoiseType.PINK -> {
                        b0 = 0.99886 * b0 + white * 0.0555179
                        b1 = 0.99332 * b1 + white * 0.0750759
                        b2 = 0.96900 * b2 + white * 0.1538520
                        b3 = 0.86650 * b3 + white * 0.3104856
                        b4 = 0.55000 * b4 + white * 0.5329522
                        b5 = -0.7616 * b5 - white * 0.0168980
                        val p = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
                        b6 = white * 0.115926
                        p * 0.11
                    }
                    NoiseType.BROWN -> {
                        brown = (brown + 0.02 * white) / 1.02
                        brown * 3.5
                    }
                    NoiseType.HEARTBEAT -> heartbeat(sampleIndex)
                    NoiseType.SHUSH -> {
                        // 높은 대역 노이즈를 3초 주기로 숨쉬듯 크게/작게
                        val env = 0.5 + 0.5 * sin(2 * PI * sampleIndex / (sampleRate * 3.0))
                        white * 0.35 * env
                    }
                }
                if (fade < 1.0) fade = (fade + 1.0 / (sampleRate * 1.5)).coerceAtMost(1.0)
                val s = (v * volume * fade).coerceIn(-1.0, 1.0)
                buf[i] = (s * Short.MAX_VALUE).toInt().toShort()
                sampleIndex++
            }
            t.write(buf, 0, buf.size)
        }
    }

    /** 약 70bpm 의 '쿵-쿵' 두 박 심장 소리 */
    private fun heartbeat(n: Long): Double {
        val period = (sampleRate * 60.0 / 70.0).toLong()
        val pos = n % period
        fun thump(start: Long, amp: Double): Double {
            val d = pos - start
            if (d < 0 || d > sampleRate * 0.12) return 0.0
            val env = kotlin.math.exp(-d / (sampleRate * 0.03))
            return amp * env * sin(2 * PI * 55.0 * d / sampleRate)
        }
        return thump(0, 0.9) + thump((sampleRate * 0.28).toLong(), 0.6)
    }
}
