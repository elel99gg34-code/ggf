package com.momcare.app.ui.screens

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.momcare.app.data.Child
import com.momcare.app.data.Gender
import com.momcare.app.ui.BaseViewModel
import com.momcare.app.ui.RootViewModel
import com.momcare.app.ui.components.AppTextField
import com.momcare.app.ui.components.ChildAvatar
import com.momcare.app.ui.components.ChipSelector
import com.momcare.app.ui.components.DateField
import com.momcare.app.ui.components.DeleteButton
import com.momcare.app.ui.components.EmptyState
import com.momcare.app.ui.components.FormDialog
import com.momcare.app.ui.components.ItemCard
import com.momcare.app.ui.components.ListScreen
import com.momcare.app.ui.components.LocalChild
import com.momcare.app.ui.components.MomScaffold
import com.momcare.app.ui.components.NumberField
import com.momcare.app.ui.components.Pill
import com.momcare.app.ui.components.rememberDeleteTarget
import com.momcare.app.ui.theme.ChildColors
import com.momcare.app.util.Dt

class ChildrenViewModel(app: Application) : BaseViewModel(app) {
    val children = db.childDao().observeAll().asState(emptyList())

    fun save(child: Child) = io {
        if (child.id == 0L) {
            val id = db.childDao().insert(child)
            if (prefs.selectedChildId.value < 0 || db.childDao().get(prefs.selectedChildId.value) == null) {
                prefs.setSelectedChild(id)
            }
            // 출생 기록을 첫 성장 기록으로 저장
            if (child.birthHeightCm != null || child.birthWeightKg != null) {
                db.growthDao().upsert(
                    com.momcare.app.data.GrowthRecord(
                        childId = id, date = child.birthDate,
                        heightCm = child.birthHeightCm, weightKg = child.birthWeightKg, memo = "출생"
                    )
                )
            }
        } else {
            db.childDao().upsert(child)
        }
    }

    fun delete(child: Child) = io {
        db.childDao().delete(child)
        val rest = db.childDao().getAll()
        prefs.setSelectedChild(rest.firstOrNull()?.id ?: -1L)
    }
}

@Composable
fun ChildrenScreen(nav: NavController, root: RootViewModel, vm: ChildrenViewModel = viewModel()) {
    val children by vm.children.collectAsState()
    val current = LocalChild.current
    var editing by remember { mutableStateOf<Child?>(null) }
    var adding by remember { mutableStateOf(false) }
    val askDelete = rememberDeleteTarget<Child>(
        onConfirm = { vm.delete(it) },
        title = "아이 프로필을 삭제할까요?",
        message = "해당 아이의 모든 기록(성장, 수유, 수면 등)이 함께 삭제돼요."
    )

    MomScaffold("아이 프로필", nav, fabLabel = "아이 추가", onFab = { adding = true }) { padding ->
        ListScreen(padding) {
            if (children.isEmpty()) {
                item { EmptyState("👶", "아직 등록된 아이가 없어요", "오른쪽 아래 버튼으로 첫 아이를 등록해보세요.") }
            }
            items(children.size) { i ->
                val c = children[i]
                ItemCard(
                    emoji = c.gender.emoji,
                    title = c.name,
                    subtitle = "${Dt.ageText(c.birthDate)} · ${Dt.date(c.birthDate)}",
                    detail = listOfNotNull(
                        c.bloodType.takeIf { it.isNotBlank() }?.let { "혈액형 $it" },
                        c.memo.takeIf { it.isNotBlank() }
                    ).joinToString(" · "),
                    accent = com.momcare.app.ui.theme.childColor(c.colorIndex),
                    onClick = { root.select(c.id); nav.popBackStack() },
                    trailing = {
                        Row {
                            if (c.id == current?.id) Pill("선택됨")
                            IconButton(onClick = { editing = c }) { Icon(Icons.Default.Edit, "수정") }
                            DeleteButton { askDelete(c) }
                        }
                    }
                )
            }
        }
    }

    if (adding) ChildFormDialog(null, onDismiss = { adding = false }, onSave = { vm.save(it); adding = false })
    editing?.let { ChildFormDialog(it, onDismiss = { editing = null }, onSave = { c -> vm.save(c); editing = null }) }
}

@Composable
private fun ChildFormDialog(initial: Child?, onDismiss: () -> Unit, onSave: (Child) -> Unit) {
    var name by remember { mutableStateOf(initial?.name ?: "") }
    var birth by remember { mutableStateOf(initial?.birthDate ?: Dt.todayStart()) }
    var gender by remember { mutableStateOf(initial?.gender ?: Gender.UNKNOWN) }
    var blood by remember { mutableStateOf(initial?.bloodType ?: "") }
    var bw by remember { mutableStateOf(initial?.birthWeightKg?.toString() ?: "") }
    var bh by remember { mutableStateOf(initial?.birthHeightCm?.toString() ?: "") }
    var color by remember { mutableStateOf(initial?.colorIndex ?: 0) }
    var memo by remember { mutableStateOf(initial?.memo ?: "") }

    FormDialog(
        title = if (initial == null) "아이 등록" else "프로필 수정",
        onDismiss = onDismiss,
        confirmEnabled = name.isNotBlank(),
        onConfirm = {
            onSave(
                (initial ?: Child(name = "", birthDate = birth)).copy(
                    name = name.trim(), birthDate = birth, gender = gender, bloodType = blood.trim(),
                    birthWeightKg = bw.toDoubleOrNull(), birthHeightCm = bh.toDoubleOrNull(),
                    colorIndex = color, memo = memo.trim()
                )
            )
        }
    ) {
        AppTextField(name, { name = it }, "이름(애칭)")
        DateField("생일", birth, { birth = it })
        Text("성별", style = MaterialTheme.typography.bodySmall)
        ChipSelector(Gender.entries, gender, { "${it.emoji} ${it.label}" }, { gender = it })
        AppTextField(blood, { blood = it }, "혈액형 (선택)")
        if (initial == null) {
            NumberField(bw, { bw = it }, "출생 시 몸무게", "kg")
            NumberField(bh, { bh = it }, "출생 시 키", "cm")
        }
        Text("대표 색상", style = MaterialTheme.typography.bodySmall)
        Row {
            ChildColors.forEachIndexed { i, c ->
                androidx.compose.foundation.layout.Box(
                    Modifier.size(if (i == color) 36.dp else 30.dp).clip(CircleShape).background(c)
                        .clickable { color = i }
                )
                Spacer(Modifier.width(8.dp))
            }
        }
        AppTextField(memo, { memo = it }, "메모", singleLine = false, minLines = 2)
    }
}
