package com.momcare.app.content

data class CounselCategory(val id: String, val emoji: String, val title: String, val desc: String)

data class CounselSkill(
    val id: String,
    val category: String,
    val emoji: String,
    val title: String,
    /** 한 줄 요약 (알림에 표시) */
    val summary: String,
    /** 왜 중요한가 */
    val why: String,
    /** 단계별 방법 */
    val steps: List<String>,
    /** 이렇게 말해보세요 */
    val sayThis: List<String>,
    /** 이렇게는 피하세요 */
    val avoid: List<String>,
    /** 오늘의 미션 */
    val practice: String,
    /** 상황 예시 */
    val scenario: String,
    val level: Int = 1
)

object CounselContent {

    val categories = listOf(
        CounselCategory("CHILD", "🧒", "아이와 대화", "아이가 마음을 열고 말하게 만드는 기술"),
        CounselCategory("EMOTION", "🫶", "감정 코칭", "아이의 감정을 읽고 다루는 법"),
        CounselCategory("COUPLE", "👫", "부부·가족 대화", "배우자, 양가 가족과 갈등 없이 소통하기"),
        CounselCategory("TEACHER", "🏫", "선생님 상담", "어린이집·유치원·학교 상담 잘 받기"),
        CounselCategory("DOCTOR", "🩺", "병원·전문가 상담", "의사·소아과·전문가에게 잘 설명하고 묻기"),
        CounselCategory("SELF", "🌷", "나를 위한 대화", "지치지 않고 내 마음을 돌보는 말하기")
    )

    fun categoryOf(id: String): CounselCategory? = categories.firstOrNull { it.id == id }

    val all: List<CounselSkill> = listOf(
        // ───────── 아이와 대화 ─────────
        CounselSkill(
            id = "child_listen", category = "CHILD", emoji = "👂", title = "끝까지 듣기(적극적 경청)",
            summary = "아이 말이 끝날 때까지 조언 없이 들어주기",
            why = "아이는 '내 말이 끝까지 받아들여진다'는 경험을 통해 부모를 안전한 상대로 인식해요. 중간에 끼어들면 아이는 점점 말을 줄입니다.",
            steps = listOf(
                "하던 일을 멈추고 눈높이를 맞춰 앉는다",
                "아이가 말하는 동안 고개를 끄덕이며 '응', '그랬구나'만 말한다",
                "말이 끝나고 3초 기다린다 (아이가 덧붙이는 경우가 많아요)",
                "들은 내용을 한 문장으로 되돌려 말해준다",
                "조언은 아이가 요청할 때만 한다"
            ),
            sayThis = listOf("그랬구나, 더 말해줄래?", "엄마가 잘 듣고 있어. 천천히 말해도 돼.", "그래서 어떻게 됐어?"),
            avoid = listOf("\"그건 네가 잘못했네\" 바로 판단하기", "휴대폰 보면서 \"응응\" 대답하기", "아이 말을 끊고 결론 내리기"),
            practice = "오늘 아이가 하는 이야기 한 가지를 조언 없이 끝까지 들어보세요.",
            scenario = "아이가 어린이집에서 친구와 다퉜다고 말을 꺼낼 때, 바로 '네가 먼저 양보해야지'라고 하기보다 끝까지 듣고 '속상했겠다'로 시작해요."
        ),
        CounselSkill(
            id = "child_mirror", category = "CHILD", emoji = "🪞", title = "되돌려 말하기(반영)",
            summary = "아이가 한 말을 부모의 말로 다시 들려주기",
            why = "내 말을 다시 들려주면 아이는 '이해받았다'고 느끼고 생각이 정리돼요. 오해도 바로 줄어듭니다.",
            steps = listOf(
                "아이의 말에서 핵심 사실과 감정을 찾는다",
                "\"~해서 ~했구나\" 형식으로 한 문장으로 요약한다",
                "맞는지 확인한다 (\"맞아?\")",
                "아니라고 하면 아이의 정정 내용을 다시 반영한다"
            ),
            sayThis = listOf("블록이 무너져서 화가 났구나, 맞아?", "친구가 같이 안 놀아줘서 속상했구나."),
            avoid = listOf("앵무새처럼 똑같이 반복하기", "반영 뒤에 곧바로 '하지만'을 붙이기"),
            practice = "오늘 아이 말을 세 번 '~했구나'로 되돌려 말해보세요.",
            scenario = "\"유치원 안 가!\"라고 할 때 \"가기 싫구나\"로 먼저 받으면 이유를 말하기 시작해요."
        ),
        CounselSkill(
            id = "child_open_question", category = "CHILD", emoji = "❓", title = "열린 질문하기",
            summary = "'예/아니오'로 끝나지 않는 질문으로 대화 열기",
            why = "\"오늘 재밌었어?\"는 \"응\"으로 끝나지만 \"오늘 제일 웃겼던 건 뭐야?\"는 이야기를 만들어요.",
            steps = listOf(
                "'무엇을/어떻게/어떤' 으로 시작하는 질문을 만든다",
                "'왜?'는 추궁처럼 들릴 수 있으니 '어떤 마음이었어?'로 바꾼다",
                "한 번에 하나씩만 묻는다",
                "답이 짧아도 재촉하지 않고 다음 질문은 답에서 이어간다"
            ),
            sayThis = listOf("오늘 제일 기억에 남는 일은 뭐야?", "그때 어떤 기분이었어?", "내일은 어떤 일이 있으면 좋겠어?"),
            avoid = listOf("\"왜 그랬어?\" 반복하기", "질문 폭탄(연속 3개 이상)", "정답을 정해두고 묻기"),
            practice = "잠자리에서 '오늘 제일 좋았던 일 / 속상했던 일' 두 가지를 물어보세요.",
            scenario = "하원길에 \"오늘 뭐 했어?\" 대신 \"오늘 선생님이랑 뭐하고 놀았어?\"로 구체화해요."
        ),
        CounselSkill(
            id = "child_i_message", category = "CHILD", emoji = "🙋", title = "나-전달법",
            summary = "'너 때문에' 대신 '나는 ~해서 ~했어'로 말하기",
            why = "비난 없이 내 감정과 바람을 전하면 아이가 방어하지 않고 행동을 바꾸려는 마음이 생겨요.",
            steps = listOf(
                "상황을 비난 없이 사실만 묘사한다",
                "그 상황에서 느낀 내 감정을 말한다",
                "바라는 행동을 구체적으로 부탁한다"
            ),
            sayThis = listOf("장난감이 바닥에 있으면 엄마가 밟을까 봐 걱정돼. 자기 전에 상자에 넣어줄래?", "소리가 크면 엄마가 깜짝 놀라. 조금 작게 말해줄래?"),
            avoid = listOf("\"너는 맨날 이래\" 일반화", "\"엄마 속상하게 하지 마\" 죄책감 주기"),
            practice = "오늘 한 번, '너는~' 으로 시작하려던 말을 '엄마는~'으로 바꿔 말해보세요.",
            scenario = "식탁에서 장난치는 아이에게 \"너 왜 그래!\" 대신 \"밥이 쏟아질까 봐 엄마가 걱정돼. 앉아서 먹어줄래?\""
        ),
        CounselSkill(
            id = "child_choice", category = "CHILD", emoji = "🔀", title = "선택권 주기",
            summary = "둘 중 하나를 고르게 해서 실랑이 줄이기",
            why = "아이는 스스로 결정했다고 느낄 때 협조해요. 부모는 허용 가능한 범위 안에서만 선택지를 줍니다.",
            steps = listOf(
                "꼭 해야 하는 일을 정한다 (예: 양치)",
                "방법/순서/도구에서 선택지를 2개 만든다",
                "아이가 고르면 바로 칭찬하고 실행한다",
                "고르지 않으면 \"그럼 엄마가 정할게\"로 부드럽게 마무리한다"
            ),
            sayThis = listOf("파란 칫솔로 할래, 노란 칫솔로 할래?", "옷은 지금 입을래, 밥 먹고 입을래?"),
            avoid = listOf("선택지가 아닌 것을 선택지처럼 제시하기", "고른 뒤에 번복하게 만들기"),
            practice = "하기 싫어하는 일 한 가지를 선택지 2개로 바꿔 말해보세요.",
            scenario = "잠자기 싫어하는 아이에게 \"책 한 권 읽고 잘래, 노래 듣고 잘래?\""
        ),
        CounselSkill(
            id = "child_praise", category = "CHILD", emoji = "🌟", title = "과정 칭찬하기",
            summary = "결과보다 노력과 과정을 구체적으로 칭찬",
            why = "'똑똑하다'는 칭찬보다 '끝까지 해봤구나'가 도전하는 마음을 키워줘요.",
            steps = listOf(
                "아이가 한 행동을 구체적으로 묘사한다",
                "노력·전략·태도를 짚는다",
                "느낀 점을 덧붙인다"
            ),
            sayThis = listOf("어려웠는데 포기하지 않고 끝까지 맞췄네!", "친구에게 먼저 장난감을 건네는 모습이 엄마는 참 따뜻해 보였어."),
            avoid = listOf("\"최고야/천재야\"처럼 막연한 칭찬", "다른 아이와 비교하는 칭찬"),
            practice = "오늘 아이의 노력 한 가지를 구체적으로 칭찬해주세요.",
            scenario = "퍼즐을 맞춘 아이에게 \"역시 똑똑해\" 대신 \"모서리부터 찾아서 맞췄구나, 좋은 방법이야.\""
        ),
        CounselSkill(
            id = "child_pause", category = "CHILD", emoji = "⏸️", title = "멈추고 숨쉬기 후 말하기",
            summary = "화가 올라올 때 10초 멈춘 뒤 말하기",
            why = "감정이 높을 때 한 말은 후회로 남기 쉬워요. 부모가 멈추는 모습이 아이에게 감정 조절의 본보기가 됩니다.",
            steps = listOf(
                "화가 올라오는 신호(턱, 어깨, 목소리)를 알아차린다",
                "\"엄마 잠깐 숨 쉬고 올게\"라고 말하고 10초 멈춘다",
                "코로 4초 들이쉬고 6초 내쉬기를 세 번 한다",
                "목소리를 평소보다 한 톤 낮추고 다시 말한다"
            ),
            sayThis = listOf("엄마가 지금 화가 나서 잠깐 쉬었다가 얘기할게.", "우리 둘 다 진정되면 다시 이야기하자."),
            avoid = listOf("소리 지르고 나서 사과 없이 넘어가기", "아이를 방에 혼자 두고 사라지기"),
            practice = "오늘 화가 올라올 때 한 번이라도 10초 멈춤을 시도해보세요.",
            scenario = "우유를 엎지른 아이에게 소리치려는 순간, 숨을 쉬고 \"닦자, 같이 하자\"로 시작합니다.", level = 2
        ),
        CounselSkill(
            id = "child_repair", category = "CHILD", emoji = "🩹", title = "아이에게 사과하고 회복하기",
            summary = "실수했을 땐 짧고 진심 있게 사과하기",
            why = "부모의 사과는 아이에게 '실수해도 관계는 회복된다'는 신뢰를 줘요.",
            steps = listOf("아이가 진정된 뒤 눈높이로 다가간다", "무엇이 잘못이었는지 구체적으로 말한다", "아이의 감정을 인정한다", "다음에 어떻게 할지 약속한다"),
            sayThis = listOf("아까 소리 질러서 미안해. 많이 놀랐지?", "엄마가 화가 났어도 그렇게 말하면 안 됐어. 다음엔 숨 쉬고 말할게."),
            avoid = listOf("\"네가 말 안 들어서 그런 거지만 미안\" 조건부 사과", "사과 후 바로 훈계 이어가기"),
            practice = "최근 후회되는 순간이 있다면 아이에게 한 문장으로 사과해보세요.",
            scenario = "숙제하다 짜증냈던 저녁, 자기 전에 안아주며 사과합니다.", level = 2
        ),

        // ───────── 감정 코칭 ─────────
        CounselSkill(
            id = "emo_name", category = "EMOTION", emoji = "🏷️", title = "감정에 이름 붙여주기",
            summary = "'화났구나, 서운했구나'로 감정을 말로 바꿔주기",
            why = "감정을 말로 표현하면 뇌의 흥분이 가라앉아요. 아이가 감정 어휘를 배우면 떼쓰기 대신 말하게 됩니다.",
            steps = listOf("행동 뒤에 숨은 감정을 추측한다", "\"~한 마음이구나\"로 이름 붙인다", "아이가 맞다고 하면 크기도 물어본다 (\"조금? 많이?\")", "감정이 가라앉은 뒤 해결을 이야기한다"),
            sayThis = listOf("동생이 장난감을 가져가서 샘이 났구나.", "기대했는데 못 가서 실망했구나."),
            avoid = listOf("\"별일 아니야, 울지 마\"", "\"그게 뭐가 무섭다고\""),
            practice = "오늘 아이의 감정에 이름을 세 번 붙여주세요.",
            scenario = "과자를 못 먹게 해서 우는 아이에게 \"먹고 싶었는데 못 먹어서 속상하구나.\""
        ),
        CounselSkill(
            id = "emo_accept", category = "EMOTION", emoji = "🤲", title = "감정은 받아주고 행동은 제한하기",
            summary = "'화나는 건 괜찮아, 때리는 건 안 돼'",
            why = "모든 감정은 괜찮고 일부 행동만 안 된다는 기준을 알려주면 아이가 안전하게 감정을 표현해요.",
            steps = listOf("먼저 감정을 인정한다", "넘어선 행동에 선을 긋는다", "대신 할 수 있는 행동 2가지를 알려준다"),
            sayThis = listOf("화가 많이 났구나. 화나는 건 괜찮아. 하지만 때리는 건 안 돼. 베개를 치거나 발을 쿵쿵 굴러볼까?"),
            avoid = listOf("감정까지 혼내기 (\"화내면 안 돼\")", "선만 긋고 대안 없이 끝내기"),
            practice = "아이가 화낼 때 '감정 OK, 행동 STOP, 대안 제시' 순서로 말해보세요.",
            scenario = "블록을 던지는 아이를 안전하게 붙잡고 위 3단계로 말합니다."
        ),
        CounselSkill(
            id = "emo_calm_corner", category = "EMOTION", emoji = "🧸", title = "진정 코너 만들기",
            summary = "벌이 아닌 '마음 쉬는 곳'을 함께 정하기",
            why = "아이가 스스로 가라앉는 경험을 반복하면 자기 조절 능력이 자라요.",
            steps = listOf("평소 평온할 때 아이와 함께 코너를 만든다", "쿠션, 그림책, 호흡 카드를 둔다", "벌이 아니라 선택임을 설명한다", "아이가 원하면 옆에 앉아 함께 숨쉰다"),
            sayThis = listOf("마음이 뜨거울 때는 여기서 쉬어도 돼. 엄마도 같이 있을게."),
            avoid = listOf("\"저기 가서 반성해\"", "시간을 길게 강요하기"),
            practice = "집 안에 아이와 함께 쓸 '마음 쉬는 자리'를 한 곳 정해보세요.",
            scenario = "화가 난 아이가 스스로 쿠션 코너로 가서 3분 뒤 돌아옵니다.", level = 2
        ),
        CounselSkill(
            id = "emo_fear", category = "EMOTION", emoji = "🌙", title = "두려움 다루기",
            summary = "무서움을 부정하지 않고 작게 쪼개 함께 넘기",
            why = "아이의 두려움은 진짜예요. 인정받은 두려움은 빨리 줄어듭니다.",
            steps = listOf("\"무섭구나\"로 먼저 인정한다", "무엇이 가장 무서운지 묻는다", "작은 단계로 나누어 함께 해본다", "용기 낸 순간을 구체적으로 칭찬한다"),
            sayThis = listOf("어두운 게 무섭구나. 엄마가 불을 조금만 켜둘까?", "문 앞까지만 같이 가볼까?"),
            avoid = listOf("\"무섭긴 뭐가 무서워\"", "억지로 노출시키기"),
            practice = "아이의 두려움 하나를 물어보고 '작은 한 걸음'을 정해보세요.",
            scenario = "병원 가기 무서워하는 아이와 인형으로 진료 놀이를 먼저 해봅니다."
        ),
        CounselSkill(
            id = "emo_sibling", category = "EMOTION", emoji = "👭", title = "형제 갈등 중재하기",
            summary = "누가 잘못했는지보다 각자의 마음을 먼저 듣기",
            why = "판결자가 되면 아이들은 서로를 일러바치게 돼요. 중재자가 되면 해결책을 함께 찾습니다.",
            steps = listOf("안전부터 확인하고 둘을 떼어놓는다", "각자 1분씩 번갈아 이야기하게 한다", "서로의 마음을 대신 정리해준다", "해결책을 아이들이 제안하게 한다"),
            sayThis = listOf("둘 다 이 장난감을 갖고 싶었구나. 어떻게 하면 둘 다 괜찮을까?"),
            avoid = listOf("\"언니니까 참아\"", "증거를 따지며 판결하기"),
            practice = "다음 다툼에서 판결 대신 '각자 마음 듣기'를 해보세요.",
            scenario = "장난감 다툼에서 타이머를 쓰며 번갈아 사용하는 규칙을 아이들이 정합니다.", level = 2
        ),

        // ───────── 부부·가족 ─────────
        CounselSkill(
            id = "couple_soft_start", category = "COUPLE", emoji = "🌤️", title = "부드럽게 시작하기",
            summary = "비난 대신 감정+상황+부탁으로 대화 열기",
            why = "대화의 첫 30초가 결과를 좌우해요. 비난으로 시작하면 방어가 되고, 부드럽게 시작하면 협력이 됩니다.",
            steps = listOf("\"나는 ~해서 ~한 마음이야\"로 시작한다", "상황만 사실대로 말한다", "원하는 행동을 구체적으로 부탁한다", "고맙다는 말로 마무리한다"),
            sayThis = listOf("오늘 아이 재우고 나니 많이 지쳤어. 내일 저녁엔 설거지를 도와줄 수 있을까?"),
            avoid = listOf("\"당신은 항상/전혀\"", "과거 일 끌어오기"),
            practice = "오늘 배우자에게 부탁 한 가지를 '나는~' 문장으로 해보세요.",
            scenario = "퇴근 직후 \"왜 이제 와?\" 대신 \"기다렸어, 오늘 좀 힘들었는데 같이 얘기하고 싶어.\""
        ),
        CounselSkill(
            id = "couple_share_duty", category = "COUPLE", emoji = "⚖️", title = "육아·집안일 분담 협상",
            summary = "서운함 대신 목록과 시간으로 분담 정하기",
            why = "'알아서 해주겠지'는 갈등의 씨앗이에요. 눈에 보이는 목록이 서로의 부담을 알게 해요.",
            steps = listOf("해야 할 일을 모두 적는다 (보이지 않는 일 포함)", "각자 선호/가능 시간을 말한다", "역할을 나누고 2주 시범 운영한다", "주 1회 10분 점검 시간을 갖는다"),
            sayThis = listOf("우리 집 일을 다 적어봤어. 같이 보면서 나눠볼래?"),
            avoid = listOf("\"도와준다\"는 표현 (공동 책임이에요)", "상대의 방식을 지적하며 다시 하기"),
            practice = "이번 주 안에 배우자와 '집안일 목록'을 같이 써보세요. (할 일 기능 활용)",
            scenario = "아침은 아빠, 저녁 목욕은 엄마로 고정하고 일요일 밤에 점검합니다.", level = 2
        ),
        CounselSkill(
            id = "couple_appreciate", category = "COUPLE", emoji = "💐", title = "감사 표현 5:1",
            summary = "불평 1번에 감사 5번을 말하기",
            why = "관계가 건강한 부부는 긍정 상호작용이 부정보다 훨씬 많아요.",
            steps = listOf("하루에 한 번 고마운 점을 구체적으로 말한다", "행동 + 내가 받은 영향 순서로 표현한다", "메신저로도 짧게 전한다"),
            sayThis = listOf("오늘 아이 목욕 시켜줘서 덕분에 내가 쉴 수 있었어. 고마워."),
            avoid = listOf("감사 뒤에 '근데'로 이어가기"),
            practice = "오늘 배우자(또는 가족)에게 구체적인 감사 한 문장을 보내보세요.",
            scenario = "아이가 잠든 뒤 거실에서 서로에게 오늘 고마웠던 일 하나씩 말하기."
        ),
        CounselSkill(
            id = "couple_inlaws", category = "COUPLE", emoji = "🏡", title = "양가 어른과 경계 지키기",
            summary = "육아 방식 조언에 감사+선 긋기로 응답하기",
            why = "관계를 해치지 않으면서 부모로서의 결정권을 지키는 말하기가 필요해요.",
            steps = listOf("먼저 걱정해주신 마음에 감사한다", "우리 부부가 정한 방식을 '결정'으로 알린다", "도움받고 싶은 부분을 제안한다", "배우자가 자기 부모님께 직접 전달하도록 합의한다"),
            sayThis = listOf("걱정해주셔서 감사해요. 소아과 선생님과 상의해서 이렇게 하기로 했어요.", "이 부분은 저희가 해볼게요. 대신 주말에 아이 봐주시면 큰 도움이 될 것 같아요."),
            avoid = listOf("그 자리에서 논쟁하기", "배우자 뒤에서 험담하기"),
            practice = "받고 싶은 도움 한 가지를 어른께 구체적으로 부탁해보세요.",
            scenario = "이유식 시작 시기에 대한 조언에 감사를 표하고 병원 권고를 근거로 설명합니다.", level = 3
        ),

        // ───────── 선생님 상담 ─────────
        CounselSkill(
            id = "teacher_prepare", category = "TEACHER", emoji = "📝", title = "상담 전 준비 3가지",
            summary = "질문 3개·관찰 사례 2개·바라는 점 1개 준비하기",
            why = "짧은 상담 시간(10~20분)을 알차게 쓰려면 준비가 필수예요.",
            steps = listOf("집에서 관찰한 아이의 모습 2가지를 적는다", "선생님께 궁금한 점을 3개 적는다", "상담 후 얻고 싶은 것 1가지를 정한다", "상담 일지에 목표를 미리 기록한다"),
            sayThis = listOf("집에서는 이런 모습인데, 기관에서는 어떤지 궁금해요.", "아이가 좋아하는 활동과 어려워하는 활동이 무엇인가요?"),
            avoid = listOf("준비 없이 가서 \"우리 애 어때요?\"만 묻기", "다른 아이와 비교하는 질문"),
            practice = "다음 상담을 위해 상담 일지에 목표를 미리 적어보세요.",
            scenario = "적응 상담 때 '낯가림, 식사, 낮잠' 세 가지를 질문 목록으로 가져갑니다."
        ),
        CounselSkill(
            id = "teacher_partner", category = "TEACHER", emoji = "🤝", title = "선생님을 협력자로 대하기",
            summary = "평가가 아닌 '같이 돕는 팀'으로 시작하기",
            why = "선생님이 편하게 아이의 모습을 말해줄 때 가장 정확한 정보를 얻어요.",
            steps = listOf("먼저 감사 인사와 긍정적인 관찰로 시작한다", "걱정은 '질문'으로 꺼낸다", "선생님의 의견을 끝까지 듣는다", "함께 해볼 방법 1~2개를 정하고 감사로 마무리한다"),
            sayThis = listOf("항상 신경 써주셔서 감사해요. 요즘 아이가 집에서 이런 얘기를 해서요, 혹시 보셨는지 궁금해요."),
            avoid = listOf("추궁하는 말투 (\"왜 우리 애만?\")", "선생님 앞에서 아이 흉보기"),
            practice = "선생님께 감사 메모나 짧은 인사를 전해보세요.",
            scenario = "친구와의 갈등 이야기를 들었을 때 사실 확인 질문으로 시작합니다.", level = 2
        ),
        CounselSkill(
            id = "teacher_followup", category = "TEACHER", emoji = "🔁", title = "상담 후 실천과 점검",
            summary = "약속한 방법을 2주 해보고 짧게 피드백 나누기",
            why = "상담은 끝이 아니라 시작이에요. 합의한 방법을 집에서도 이어가야 효과가 있습니다.",
            steps = listOf("상담 내용을 3줄로 정리해 기록한다", "집에서 할 수 있는 한 가지를 정한다", "2주 뒤 알림장으로 변화를 공유한다"),
            sayThis = listOf("말씀해주신 대로 집에서 해봤더니 이런 변화가 있었어요. 기관에서는 어떤가요?"),
            avoid = listOf("상담 후 아무 변화 없이 방치", "아이 앞에서 상담 내용을 그대로 전하기"),
            practice = "최근 상담 내용을 상담 일지에 정리하고 실천 한 가지를 적어보세요.",
            scenario = "편식 상담 후 2주간 '한 입 도전' 스티커 판을 운영합니다.", level = 2
        ),

        // ───────── 병원·전문가 ─────────
        CounselSkill(
            id = "doctor_describe", category = "DOCTOR", emoji = "🩺", title = "증상 정확히 설명하기",
            summary = "언제부터·얼마나·어떻게 달라졌는지 순서대로 말하기",
            why = "진료 시간은 짧아요. 기록해둔 체온·수유·수면 정보가 있으면 진단이 정확해집니다.",
            steps = listOf("증상이 시작된 시점과 변화를 시간순으로 말한다", "체온·수유량·소변/대변 횟수를 수치로 전달한다", "먹은 약과 시간을 알려준다", "가장 걱정되는 점을 마지막에 강조한다"),
            sayThis = listOf("어제 저녁 8시부터 열이 38.5도까지 올랐고, 수유량은 평소의 절반이에요. 해열제는 10시에 한 번 먹였어요."),
            avoid = listOf("\"그냥 좀 이상해요\"처럼 모호하게 말하기", "기억에 의존해서 수치 말하기"),
            practice = "진료 전 앱의 체온·수유 기록 화면을 캡처하거나 요약해 가세요.",
            scenario = "앱의 '일일 리포트'를 보여주며 최근 3일 수유·배변 상황을 설명합니다."
        ),
        CounselSkill(
            id = "doctor_ask", category = "DOCTOR", emoji = "🗒️", title = "꼭 물어볼 질문 리스트",
            summary = "진단·치료·주의 신호·재방문 시점 4가지 묻기",
            why = "집에 돌아와서야 궁금한 게 생기는 일을 줄여줘요.",
            steps = listOf("\"진단명이 무엇인가요?\"", "\"약은 얼마나, 언제까지 먹이나요?\"", "\"이런 증상이 나타나면 바로 오세요\" 기준을 확인한다", "\"언제 다시 오면 되나요?\"를 묻는다"),
            sayThis = listOf("집에서 지켜봐야 할 위험 신호가 있으면 알려주세요.", "먹이는 것/피해야 할 것이 있을까요?"),
            avoid = listOf("이해 못했는데 고개만 끄덕이기", "인터넷 정보로 의사의 진단 반박하기"),
            practice = "예약 기능에 '질문 메모'를 적어 진료 전에 확인하세요.",
            scenario = "중이염 진단 시 항생제 복용 기간과 재진 시점을 메모합니다."
        ),
        CounselSkill(
            id = "doctor_specialist", category = "DOCTOR", emoji = "🧠", title = "발달·심리 전문가 상담 준비",
            summary = "구체적 행동 사례와 영상으로 상담 효율 높이기",
            why = "전문가는 관찰 사례가 구체적일수록 도움을 줄 수 있어요.",
            steps = listOf("걱정되는 행동의 빈도·상황·시작 시기를 기록한다", "가능하면 짧은 영상을 준비한다", "발달 체크리스트 결과를 함께 가져간다", "아이의 강점도 함께 알려준다"),
            sayThis = listOf("최근 한 달간 이런 상황에서 하루 3~4번 나타나요. 영상으로 찍어왔어요."),
            avoid = listOf("아이 앞에서 문제 행동을 길게 나열하기", "'우리 애가 문제 있는 거죠?' 단정"),
            practice = "발달 체크리스트에서 '아직' 항목을 보고 질문 3개를 적어보세요.",
            scenario = "말이 늦은 아이의 언어 상담에서 하루 사용 단어 목록을 가져갑니다.", level = 3
        ),

        // ───────── 나를 위한 대화 ─────────
        CounselSkill(
            id = "self_help_ask", category = "SELF", emoji = "🙏", title = "도움 요청하는 말",
            summary = "'힘들어'에서 끝나지 않고 구체적으로 부탁하기",
            why = "엄마도 도움이 필요해요. 구체적일수록 상대가 도울 수 있어요.",
            steps = listOf("필요한 도움을 구체적 행동으로 정한다", "시간과 범위를 함께 말한다", "거절해도 괜찮다는 여지를 준다", "도움받은 뒤 감사를 표현한다"),
            sayThis = listOf("토요일 오전 2시간만 아이 봐줄 수 있어? 그동안 병원 다녀오고 싶어."),
            avoid = listOf("\"알아서 눈치 채주겠지\"", "도움을 받고 미안하다고만 말하기"),
            practice = "오늘 가족이나 친구에게 도움 한 가지를 구체적으로 부탁해보세요.",
            scenario = "아이가 아픈 주에 저녁 준비를 하루 부탁합니다."
        ),
        CounselSkill(
            id = "self_talk", category = "SELF", emoji = "💗", title = "나에게 다정하게 말하기",
            summary = "'나는 부족한 엄마' 대신 '충분히 애쓰고 있어'",
            why = "자기 비난은 번아웃을 키우고, 자기 연민은 회복력을 높여요.",
            steps = listOf("자책이 떠오르면 알아차린다 (\"지금 자책 중이네\")", "친한 친구가 같은 상황이라면 뭐라고 할지 떠올린다", "그 말을 나에게 해준다", "손을 가슴에 얹고 세 번 깊게 숨 쉰다"),
            sayThis = listOf("오늘도 최선을 다했어. 완벽하지 않아도 충분히 좋은 엄마야."),
            avoid = listOf("SNS 속 육아와 비교하기", "'다른 엄마는 다 하는데'"),
            practice = "오늘 자기 전에 나에게 해줄 칭찬 한 문장을 마음 건강 메모에 적어보세요.",
            scenario = "아이에게 화를 낸 날, 후회 대신 \"지쳤구나, 내일 다시 해보자\"라고 말해줍니다."
        ),
        CounselSkill(
            id = "self_boundary", category = "SELF", emoji = "🚧", title = "정중하게 거절하기",
            summary = "'미안하지만 이번엔 어려워요'로 부담 줄이기",
            why = "모든 부탁을 들어주다 보면 정작 아이와 나를 돌볼 에너지가 없어요.",
            steps = listOf("바로 대답하지 않고 \"생각해볼게요\"라고 시간을 번다", "거절 이유는 짧게, 사과는 한 번만", "가능하다면 대안을 제시한다"),
            sayThis = listOf("불러줘서 고마워요. 이번엔 아이 컨디션 때문에 어려울 것 같아요. 다음 모임엔 꼭 갈게요."),
            avoid = listOf("길고 변명처럼 들리는 설명", "억지로 승낙하고 뒤에서 힘들어하기"),
            practice = "이번 주 부담스러운 부탁 하나를 정중하게 거절하거나 조정해보세요.",
            scenario = "어린이집 학부모 모임 담당을 맡아달라는 요청에 정중히 거절하고 다른 방식으로 돕겠다고 제안합니다.", level = 2
        ),
        CounselSkill(
            id = "self_review", category = "SELF", emoji = "🌙", title = "하루 마무리 3줄 돌아보기",
            summary = "잘한 일·배운 일·내일 한 가지 적기",
            why = "하루를 짧게 정리하면 죄책감이 줄고 다음 날의 방향이 선명해져요.",
            steps = listOf("오늘 잘한 일 한 가지", "오늘 배운 점 한 가지", "내일 해볼 작은 행동 한 가지", "육아일기나 상담 일지에 기록한다"),
            sayThis = listOf("오늘은 아이 말을 끝까지 들어줬어. 내일은 10초 숨 쉬고 말해볼래."),
            avoid = listOf("못한 일만 나열하기"),
            practice = "오늘 밤 3줄 돌아보기를 상담 일지에 써보세요.",
            scenario = "아이를 재우고 난 뒤 5분, 따뜻한 차와 함께 3줄을 적습니다."
        )
    )

    private val byId: Map<String, CounselSkill> by lazy { all.associateBy { it.id } }

    fun skillById(id: String): CounselSkill? = byId[id]

    fun skillsIn(category: String): List<CounselSkill> =
        if (category.isBlank()) all else all.filter { it.category == category }

    /** 날짜(+알람별 salt)에 따라 결정적으로 오늘의 스킬을 고른다. 하루에 같은 알람은 같은 스킬. */
    fun dailySkill(dayEpoch: Long, category: String = "", salt: Int = 0): CounselSkill {
        val pool = skillsIn(category).ifEmpty { all }
        val index = ((dayEpoch + salt) % pool.size).toInt().let { if (it < 0) it + pool.size else it }
        return pool[index]
    }

    /** 신규 이용자를 위한 추천 학습 순서 */
    val starterPath: List<String> = listOf(
        "child_listen", "emo_name", "child_i_message", "child_pause",
        "couple_soft_start", "teacher_prepare", "doctor_describe", "self_talk"
    )

    /** 상황별 빠른 대응 문구 */
    data class QuickPhrase(val situation: String, val emoji: String, val phrase: String, val skillId: String)

    val quickPhrases = listOf(
        QuickPhrase("아이가 떼쓸 때", "😭", "속상했구나. 안고 있을게. 준비되면 말해줘.", "emo_name"),
        QuickPhrase("거짓말했을 때", "🤥", "솔직하게 말해줘서 고마워. 같이 해결해보자.", "child_repair"),
        QuickPhrase("싸웠을 때(형제)", "👭", "둘 다 화가 났구나. 한 명씩 이야기 들어볼게.", "emo_sibling"),
        QuickPhrase("숙제/준비 늦을 때", "⏰", "지금 할래, 5분 뒤에 할래? 네가 골라봐.", "child_choice"),
        QuickPhrase("아이가 무서워할 때", "🌙", "무서운 마음이 드는구나. 엄마가 옆에 있을게.", "emo_fear"),
        QuickPhrase("내가 화났을 때", "🔥", "엄마 잠깐 숨 쉬고 올게. 금방 돌아올게.", "child_pause"),
        QuickPhrase("배우자에게 부탁", "👫", "나 오늘 많이 지쳤어. 저녁 설거지 부탁해도 될까?", "couple_soft_start"),
        QuickPhrase("선생님께 인사", "🏫", "항상 신경 써주셔서 감사해요. 궁금한 게 있는데 여쭤봐도 될까요?", "teacher_partner")
    )
}
