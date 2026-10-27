let S;
// ───── 데이터 ─────
const HI_ERAS = ['고조선', '삼국 시대', '남북국 시대', '고려', '조선', '근대(개항기)', '일제 강점기', '현대'];
const HI_ERA_C = ['#a16207', '#b45309', '#0f766e', '#1d4ed8', '#7c3aed', '#be185d', '#475569', '#15803d'];
function hiEra(y) { return y <= -58 ? 0 : y <= 675 ? 1 : y <= 917 ? 2 : y <= 1391 ? 3 : y <= 1862 ? 4 : y <= 1909 ? 5 : y <= 1944 ? 6 : 7; }
const HI_EV_RAW = `-2333|단군왕검이 고조선을 건국했다고 전해진다
-194|위만이 고조선의 왕위를 차지하다
-108|한나라의 침략으로 고조선 멸망
-57|박혁거세가 신라를 건국
-37|주몽이 고구려를 건국
-18|온조가 백제를 건국
42|김수로가 금관가야를 건국
194|고구려 고국천왕, 진대법 실시
313|고구려 미천왕, 낙랑군 축출
371|백제 근초고왕, 평양성 공격
372|고구려 소수림왕, 불교 수용과 태학 설립
384|백제 침류왕, 불교 수용
391|광개토대왕 즉위
400|광개토대왕, 신라에 침입한 왜를 격퇴
414|광개토대왕릉비 건립
427|고구려 장수왕, 평양 천도
433|신라와 백제의 나제 동맹 성립
475|장수왕의 한성 함락, 백제 웅진 천도
503|지증왕, 국호를 '신라'로 확정
512|이사부, 우산국 정벌
520|신라 법흥왕, 율령 반포
527|이차돈의 순교, 신라 불교 공인
532|금관가야, 신라에 병합
538|백제 성왕, 사비 천도
553|신라 진흥왕, 한강 유역 차지
554|관산성 전투, 백제 성왕 전사
562|대가야 멸망
612|을지문덕의 살수대첩
645|안시성 전투, 당 태종을 물리치다
660|황산벌 전투와 백제 멸망
668|나당 연합군에 의해 고구려 멸망
676|기벌포 전투, 신라의 삼국 통일 완성
682|신문왕, 국학 설치
687|신문왕, 관료전 지급
698|대조영이 발해를 건국
751|김대성, 불국사와 석굴암 창건 시작
771|성덕대왕신종(에밀레종) 완성
828|장보고, 청해진 설치
889|원종과 애노의 난
900|견훤이 후백제를 건국
901|궁예가 후고구려를 건국
918|왕건이 고려를 건국
926|거란의 침입으로 발해 멸망
935|신라 경순왕, 고려에 항복
936|고려의 후삼국 통일
956|고려 광종, 노비안검법 실시
958|고려 광종, 과거제 실시
993|거란 1차 침입, 서희의 외교 담판
1019|강감찬의 귀주대첩
1107|윤관의 별무반, 동북 9성 축조
1126|이자겸의 난
1135|묘청의 서경 천도 운동
1145|김부식, 삼국사기 편찬
1170|무신정변 발생
1196|최충헌의 집권, 최씨 무신 정권 시작
1198|만적의 난 (노비 해방 운동)
1231|몽골의 1차 침입
1232|몽골 항쟁을 위해 강화도로 천도
1251|팔만대장경 완성
1270|개경 환도와 삼별초 항쟁 시작
1281|일연, 삼국유사 저술
1356|공민왕, 쌍성총관부 수복
1363|문익점, 원나라에서 목화씨 전래
1377|직지심체요절 인쇄 (청주 흥덕사)
1380|최무선의 화포로 진포 대첩 승리
1388|이성계의 위화도 회군
1392|이성계, 조선 건국
1394|한양 천도
1398|제1차 왕자의 난
1413|태종, 호패법 실시
1418|세종 즉위
1434|장영실, 자격루 제작
1441|측우기 제작
1443|세종, 훈민정음 창제
1446|훈민정음 반포
1453|계유정난, 수양대군 집권
1485|경국대전 완성·시행
1498|무오사화
1504|갑자사화
1506|중종반정, 연산군 폐위
1519|기묘사화, 조광조 사사
1545|을사사화
1592|임진왜란 발발
1593|권율의 행주대첩
1597|정유재란과 이순신의 명량 해전
1598|노량 해전, 이순신 전사
1608|광해군, 경기도에 대동법 실시
1610|허준, 동의보감 완성
1623|인조반정, 광해군 폐위
1627|정묘호란
1636|병자호란
1659|제1차 예송 논쟁 (기해예송)
1678|숙종, 상평통보 주조·유통
1712|백두산정계비 건립
1724|영조 즉위
1750|영조, 균역법 실시
1776|정조 즉위, 규장각 설치
1796|수원 화성 완공
1801|신유박해, 정약용 유배
1811|홍경래의 난
1861|김정호, 대동여지도 제작
1862|임술 농민 봉기 (진주 농민 봉기)
1863|고종 즉위, 흥선대원군 집권
1866|병인양요
1871|신미양요, 척화비 건립
1876|강화도 조약 체결
1882|임오군란
1884|갑신정변
1894|동학 농민 운동과 갑오개혁
1895|을미사변 (명성황후 시해)
1896|아관파천, 독립신문 창간
1897|대한제국 수립
1904|러일 전쟁 발발
1905|을사늑약 체결
1907|국채 보상 운동과 헤이그 특사 파견
1909|안중근, 하얼빈에서 이토 히로부미 저격
1910|국권 피탈 (경술국치)
1919|3·1 운동과 대한민국 임시 정부 수립
1920|봉오동 전투와 청산리 대첩
1926|6·10 만세 운동
1927|신간회 창립
1929|광주 학생 항일 운동
1932|윤봉길, 훙커우 공원 의거
1936|손기정, 베를린 올림픽 마라톤 우승
1940|한국광복군 창설
1945|8·15 광복
1948|대한민국 정부 수립
1950|6·25 전쟁 발발
1953|6·25 전쟁 정전 협정 체결
1960|4·19 혁명
1961|5·16 군사 정변
1962|제1차 경제 개발 5개년 계획 시작
1970|경부 고속 도로 개통
1972|7·4 남북 공동 성명 발표
1980|5·18 민주화 운동
1987|6월 민주 항쟁
1988|서울 올림픽 개최
1991|남북한 유엔 동시 가입
1997|외환 위기 (IMF 구제 금융)
2000|첫 남북 정상 회담과 6·15 남북 공동 선언
2002|한일 월드컵 공동 개최, 한국 4강 진출`;
const HI_EV = HI_EV_RAW.trim().split('\n').map((l) => { const i = l.indexOf('|'); const y = +l.slice(0, i); return { y, t: l.slice(i + 1).trim(), era: hiEra(y) }; });
// 이름|시대|힌트1|힌트2|힌트3 (어려운 힌트 → 쉬운 힌트)
const HI_PP_RAW = `단군왕검|0|홍익인간의 이념으로 나라를 열었다고 전해진다|곰과 호랑이가 등장하는 건국 신화의 주인공|고조선을 세운 시조
주몽|1|어려서부터 활을 매우 잘 쏘았다|알에서 태어나 부여를 탈출했다는 설화가 있다|고구려를 세운 동명성왕
온조|1|형 비류와 함께 남쪽으로 내려왔다|하남 위례성에 도읍을 정했다|주몽의 아들로 백제를 세웠다
박혁거세|1|여섯 마을 촌장들이 왕으로 추대했다|알에서 태어났다는 신화가 전해진다|신라의 시조
김수로|1|하늘에서 내려온 금빛 알에서 태어났다|인도 아유타국 공주 허황옥과 혼인했다|금관가야를 세운 왕
광개토대왕|1|'영락'이라는 연호를 사용했다|신라를 도와 왜를 물리치고 영토를 크게 넓혔다|아들 장수왕이 세운 비석으로 업적이 전해진다
장수왕|1|98세까지 살며 오랫동안 왕위에 있었다|남진 정책을 펼쳐 백제의 한성을 함락했다|427년 평양으로 도읍을 옮겼다
소수림왕|1|전진에서 들어온 불교를 받아들였다|국립 교육 기관 태학을 세웠다|율령을 반포한 고구려의 왕
근초고왕|1|4세기 백제의 전성기를 이끌었다|평양성을 공격해 고국원왕을 전사시켰다|칠지도를 왜에 보냈다고 알려진 백제의 왕
성왕|1|국호를 남부여로 바꾸었다|도읍을 사비로 옮겼다|관산성 전투에서 전사한 백제의 왕
무령왕|1|22담로에 왕족을 보내 지방을 다스렸다|공주 송산리에서 벽돌무덤이 발견되었다|무덤에서 지석이 나와 주인을 알 수 있었던 백제의 왕
진흥왕|1|화랑도를 국가 조직으로 정비했다|한강 유역을 차지하고 대가야를 정복했다|영토를 넓힌 뒤 곳곳에 순수비를 세웠다
법흥왕|1|병부를 설치하고 율령을 반포했다|이차돈의 순교를 계기로 불교를 공인했다|금관가야를 병합한 신라의 왕
지증왕|1|소를 이용한 밭갈이(우경)를 장려했다|이사부를 보내 우산국을 정벌했다|국호를 신라로 정하고 '왕'이라는 칭호를 썼다
선덕여왕|1|분황사와 황룡사 9층 목탑을 세웠다|천문 관측대인 첨성대를 세웠다고 전해진다|신라 최초의 여왕
을지문덕|1|적장 우중문에게 조롱하는 시를 보냈다|수나라 30만 대군을 물리쳤다|살수대첩을 승리로 이끈 고구려 장군
연개소문|1|천리장성 축조를 감독했다|대막리지가 되어 권력을 잡았다|당나라의 침략에 맞선 고구려의 실력자
계백|1|싸움에 나가기 전 가족을 스스로 해쳤다고 전해진다|5천 결사대를 이끌었다|황산벌에서 신라군과 싸운 백제 장군
김유신|1|금관가야 왕족의 후손이다|황산벌 전투에서 신라군을 이끌었다|삼국 통일에 큰 공을 세운 신라 장군
김춘추|1|당나라에 건너가 나당 동맹을 맺었다|진골 출신 최초의 왕이 되었다|태종 무열왕
문무왕|2|당나라 세력을 몰아내고 통일을 완성했다|죽어서 나라를 지키는 용이 되겠다고 했다|바다 속 대왕암에 묻혔다고 전해진다
원효|2|당나라 유학길에 해골물을 마시고 깨달음을 얻었다|'나무아미타불'로 불교를 대중화했다|일심 사상과 화쟁 사상을 주장한 승려
의상|2|당나라에서 화엄종을 공부했다|부석사를 세웠다|신라 화엄종을 연 승려
혜초|2|인도와 중앙아시아를 여행했다|여행기가 프랑스 학자에 의해 둔황에서 발견되었다|왕오천축국전을 쓴 승려
대조영|2|고구려 장수 출신이다|천문령 전투에서 당군을 물리쳤다|동모산에서 발해를 세웠다
장보고|2|당나라에서 무령군 소장으로 활약했다|해적을 소탕하고 해상 무역을 장악했다|완도에 청해진을 설치했다
최치원|2|당나라 빈공과에 합격한 6두품 출신|'토황소격문'으로 이름을 떨쳤다|진성여왕에게 시무 10여 조를 올렸다
견훤|2|상주 출신 신라 군인이었다|완산주(전주)에 도읍을 정했다|후백제를 세운 왕
궁예|2|스스로 미륵불이라 칭했다|국호를 마진, 태봉으로 바꾸었다|후고구려를 세운 왕
왕건|3|송악 지방 호족 출신이다|후손에게 훈요 10조를 남겼다|고려를 세운 태조
광종|3|'광덕', '준풍' 등 독자적 연호를 썼다|쌍기의 건의로 과거제를 실시했다|노비안검법으로 호족을 억눌렀다
서희|3|거란 장수 소손녕과 담판을 벌였다|말로써 싸우지 않고 적을 물러나게 했다|외교로 강동 6주를 얻어 냈다
강감찬|3|태어날 때 별이 떨어졌다는 전설이 있다 (낙성대)|거란의 3차 침입을 막아 냈다|귀주대첩의 영웅
윤관|3|여진 정벌을 위해 별무반을 만들었다|신기군, 신보군, 항마군으로 군대를 편성했다|동북 9성을 쌓았다
김부식|3|묘청의 서경 천도 운동을 진압했다|유교적 합리주의 역사관을 가졌다|현존 최고(最古) 역사서 삼국사기를 편찬했다
묘청|3|풍수지리설을 내세운 승려|금나라 정벌과 칭제건원을 주장했다|서경 천도 운동을 일으켰다
정중부|3|문신 김돈중이 수염을 태운 일로 원한을 품었다|이의방, 이고와 함께 정변을 일으켰다|1170년 무신정변의 주역
최충헌|3|명종에게 봉사 10조를 올렸다|교정도감을 설치해 권력을 장악했다|60여 년 최씨 무신 정권을 연 인물
만적|3|최충헌의 사노비였다|"왕후장상의 씨가 따로 있겠는가"라고 외쳤다|노비 해방을 꿈꾸며 난을 계획했다
일연|3|고려 후기의 승려|단군 신화를 처음으로 기록했다|삼국유사를 지었다
지눌|3|수선사 결사 운동을 이끌었다|정혜쌍수와 돈오점수를 주장했다|조계종을 정비한 고려의 승려
의천|3|문종의 아들로 왕자 출신 승려|교관겸수를 주장했다|해동 천태종을 열었다
공민왕|3|원나라 공주와 혼인했다|신돈을 등용해 개혁을 추진했다|쌍성총관부를 되찾은 반원 개혁 군주
문익점|3|원나라에 사신으로 갔다|붓두껍에 몰래 씨앗을 가져왔다고 전해진다|우리나라에 목화를 전했다
최무선|3|중국 상인에게 화약 제조법을 배웠다|화통도감 설치를 건의했다|화포로 진포에서 왜구를 무찔렀다
최영|3|홍산 대첩에서 왜구를 물리쳤다|"황금 보기를 돌같이 하라"|요동 정벌을 주장한 고려 말 장군
정몽주|3|"이 몸이 죽고 죽어 일백 번 고쳐 죽어"|단심가로 고려에 대한 충절을 노래했다|선죽교에서 피살되었다
이성계|4|황산에서 왜구를 크게 물리쳤다|위화도에서 군대를 돌려 권력을 잡았다|조선을 세운 태조
정도전|4|불씨잡변으로 불교를 비판했다|조선경국전을 지었다|한양 도성과 경복궁 설계를 이끈 조선 개국 공신
태종|4|"이런들 어떠하리 저런들 어떠하리"|두 차례 왕자의 난을 거쳐 왕이 되었다|호패법과 6조 직계제를 실시했다
세종대왕|4|집현전을 설치하고 학자들을 길렀다|4군 6진을 개척하게 했다|훈민정음을 창제한 조선 제4대 왕
장영실|4|동래현 관노 출신|해시계 앙부일구, 물시계 자격루를 만들었다|세종 때 활약한 과학 기술자
김종서|4|북방에 6진을 개척했다|'큰 호랑이'라는 별명을 가졌다|계유정난 때 수양대군에게 살해되었다
세조|4|계유정난을 일으켰다|조카 단종을 몰아내고 왕이 되었다|경국대전 편찬을 시작한 수양대군
조광조|4|소격서 폐지를 주장했다|현량과를 실시해 인재를 뽑았다|기묘사화로 목숨을 잃은 사림
이황|4|성학십도를 지어 왕에게 올렸다|도산 서원에서 제자를 길렀다|천 원권 지폐의 인물, 퇴계
이이|4|아홉 번 과거에 장원 급제했다|성학집요, 격몽요결을 지었다|오천 원권 지폐의 인물, 율곡
신사임당|4|초충도를 그린 화가|뛰어난 시와 글씨를 남겼다|율곡 이이의 어머니, 오만 원권의 인물
이순신|4|"나의 죽음을 적에게 알리지 마라"|난중일기를 남겼다|거북선으로 왜군을 물리친 장군
권율|4|임진왜란 때 도원수를 지냈다|부녀자들이 행주치마로 돌을 날랐다는 이야기가 있다|행주대첩의 승리를 이끌었다
곽재우|4|붉은 옷을 입고 싸웠다|'홍의장군'이라 불렸다|임진왜란 때 경상도에서 일어난 의병장
유성룡|4|이순신을 천거했다|임진왜란 때 영의정으로 전쟁을 지휘했다|징비록을 지었다
허준|4|선조의 어의였다|백성을 위한 의학서를 편찬했다|동의보감의 저자
광해군|4|명과 후금 사이에서 중립 외교를 펼쳤다|대동법을 처음 실시했다|인조반정으로 왕위에서 쫓겨났다
숙종|4|여러 차례 환국으로 정국을 바꾸었다|상평통보를 전국에 유통시켰다|장희빈과 관련된 이야기로 유명한 왕
안용복|4|동래 출신 어부였다|일본에 건너가 영토 문제를 따졌다|울릉도와 독도가 조선 땅임을 확인받았다
영조|4|조선 왕 중 가장 오래 왕위에 있었다|청계천을 준설하고 균역법을 실시했다|탕평책을 펼치고 사도세자의 아버지
정조|4|장용영이라는 친위 부대를 만들었다|규장각을 설치했다|수원 화성을 건설한 왕
정약용|4|강진에서 18년간 유배 생활을 했다|거중기를 설계했다|목민심서를 지은 실학자
박지원|4|양반전, 허생전을 썼다|청나라를 다녀와 여행기를 남겼다|열하일기의 저자
박제가|4|서얼 출신 규장각 검서관|소비를 우물물에 비유했다|북학의를 지은 실학자
김정호|4|청구도를 만들었다|목판으로 지도를 찍어 냈다|대동여지도를 만든 지리학자
김홍도|4|정조의 어진 제작에 참여했다|서당, 씨름 등을 그렸다|'단원'이라는 호를 쓴 풍속화가
신윤복|4|'혜원'이라는 호를 썼다|단오풍정을 그렸다|미인도로 유명한 풍속화가
김정희|4|제주도로 유배를 갔다|세한도를 그렸다|추사체를 만든 서예가
홍경래|4|몰락한 양반 출신|서북 지방 차별에 맞섰다|1811년 평안도에서 난을 일으켰다
최제우|4|경주 출신 몰락 양반|'인내천'을 내세웠다|동학을 창시했다
흥선대원군|5|경복궁을 다시 지었다|서원을 정리하고 호포제를 실시했다|척화비를 세운 고종의 아버지
고종|5|대한제국을 선포하고 황제가 되었다|광무개혁을 추진했다|헤이그에 특사를 보낸 왕
명성황후|5|고종의 왕비|러시아를 끌어들여 일본을 견제했다|을미사변 때 시해되었다
김옥균|5|급진 개화파의 중심 인물|우정총국 개국 축하연에서 정변을 일으켰다|갑신정변의 주역
전봉준|5|고부 군수 조병갑의 횡포에 맞섰다|'녹두 장군'이라 불렸다|동학 농민 운동의 지도자
서재필|5|갑신정변에 참여한 뒤 미국으로 망명했다|독립협회를 만들었다|한글 신문인 독립신문을 창간했다
안중근|5|감옥에서 동양평화론을 썼다|단지 동맹을 맺었다|하얼빈역에서 이토 히로부미를 저격했다
유관순|6|이화학당 학생이었다|아우내 장터에서 만세 운동을 이끌었다|서대문 형무소에서 순국했다
김구|6|한인애국단을 조직했다|대한민국 임시 정부의 주석을 지냈다|백범일지를 남겼다
안창호|6|신민회를 조직했다|대성 학교와 흥사단을 세웠다|'도산'이라는 호로 알려진 독립운동가
홍범도|6|포수 출신의 의병장|대한 독립군을 이끌었다|봉오동 전투에서 승리했다
김좌진|6|북로 군정서를 이끌었다|백운평, 어랑촌 전투에서 싸웠다|청산리 대첩의 영웅
윤봉길|6|한인애국단 단원|도시락 모양 폭탄을 준비했다|상하이 훙커우 공원에서 의거를 일으켰다
이봉창|6|한인애국단 첫 번째 단원|도쿄에서 일본 국왕의 마차에 폭탄을 던졌다|1932년 1월 사쿠라다몬 의거
신채호|6|조선혁명선언을 썼다|"역사는 아와 비아의 투쟁"이라 했다|조선상고사를 쓴 민족주의 역사학자
주시경|6|국어 문법을 연구했다|'한글'이라는 이름을 널리 썼다|한글 연구에 일생을 바친 국어학자
방정환|6|색동회를 만들었다|잡지 '어린이'를 펴냈다|어린이날을 만든 아동 문학가
윤동주|6|"죽는 날까지 하늘을 우러러"|하늘과 바람과 별과 시|후쿠오카 형무소에서 순국한 시인
이육사|6|본명은 이원록|청포도, 광야를 썼다|수감 번호를 호로 쓴 저항 시인
한용운|6|3·1 운동 민족 대표 33인 중 한 사람|불교 승려이자 시인|님의 침묵을 썼다
손기정|6|가슴의 일장기를 화분으로 가렸다|1936년 베를린 올림픽에 출전했다|마라톤에서 금메달을 딴 선수
이승만|7|미국에서 독립운동을 했다|1948년 정부 수립을 이끌었다|대한민국 초대 대통령
전태일|7|평화시장 재단사였다|"근로기준법을 준수하라"|1970년 노동자의 권리를 외치며 분신했다`;
const HI_PP = HI_PP_RAW.trim().split('\n').map((l) => { const a = l.split('|'); return { n: a[0], era: +a[1], h: [a[2], a[3], a[4]] }; });
const HI_MODES = [
  { k: 'mix', n: '종합 퀴즈', e: '🏯', d: '모든 유형이 섞여 나와요 · 30문제', total: 30 },
  { k: 'order', n: '연대순 정렬', e: '📜', d: '사건을 오래된 순서대로 · 20문제', total: 20 },
  { k: 'person', n: '인물 맞히기', e: '🧑‍🎓', d: '힌트를 보고 인물 찾기 · 25문제', total: 25 },
  { k: 'timeline', n: '연표 끼워넣기', e: '🗓️', d: '연표의 올바른 자리 찾기 · 20문제', total: 20 },
];
const HI_TYPES = { order: '📜 연대순 정렬', person: '🧑‍🎓 인물 맞히기', timeline: '🗓️ 연표 끼워넣기', first: '⏳ 먼저 일어난 사건', year: '📅 연도 맞히기', era: '🏛️ 시대 맞히기', who: '🏅 업적의 주인공' };
const HI_WRAP = new Map();

GAME({
  title: '한국사 퀴즈', w: 960, h: 640, bg: '#1c1410', controls: 'none',
  help: '모드를 고른 뒤 문제를 풀어요 (마우스 클릭 · 숫자키 1~5)\n📜 연대순 정렬: 오래된 사건부터 차례로 클릭 (다시 클릭하면 취소)\n🧑‍🎓 인물 맞히기: 힌트가 차례로 공개 · H키로 힌트 더 보기 (점수 감소)\n🗓️ 연표 끼워넣기: 새 사건이 들어갈 자리를 클릭\n빨리 맞힐수록 보너스 · 연속 정답 콤보 · 목숨 ❤️ 3개',
  init(g) {
    S = { phase: 'select', mode: null, qn: 0, total: 30, lives: 3, combo: 0, maxCombo: 0, correct: 0, q: null, t: 0, tMax: 20, fb: 0, fbOk: false, lv: 1, recent: [], recentP: [], anim: 0, pulse: 0, log: [] };
    g.info = '';
  },
  update(g, dt) {
    S.anim += dt; S.pulse = Math.max(0, S.pulse - dt);
    if (S.phase === 'select') {
      HI_MODES.forEach((m, i) => { const r = modeRect(i); if (g.clickIn(r.x, r.y, r.w, r.h) || g.keyp('Digit' + (i + 1))) startMode(g, m); });
      return;
    }
    const q = S.q;
    g.info = `${S.mode.n} · ${S.qn + 1}/${S.total} · Lv.${S.lv}`;
    if (S.phase === 'fb') {
      S.fb -= dt;
      if (S.fb <= 0 || (S.fb < 1.6 && (g.mouse.clicked || g.pressed('a')))) nextQ(g);
      return;
    }
    // 시간
    S.t -= dt;
    if (q.type === 'person') { const el = S.tMax - S.t; const want = el > 12 ? 3 : el > 6 ? 2 : 1; if (want > q.shown) { q.shown = want; g.sfx.tone(520, 0.08, 'sine', 0.05); } }
    if (S.t <= 0) { S.t = 0; answer(g, false, '시간 초과!'); return; }
    if (q.type === 'order') {
      q.items.forEach((ev, i) => { const r = orderRect(i, q.items.length); if (g.clickIn(r.x, r.y, r.w, r.h) || g.keyp('Digit' + (i + 1))) pickOrder(g, i); });
      if (g.keyp('Backspace') && q.picks.length) { q.picks.pop(); g.sfx.move(); }
      return;
    }
    if (q.type === 'timeline') {
      const n = q.placed.length + 1;
      for (let i = 0; i < n; i++) { const r = gapRect(i, q.placed.length); if (g.clickIn(r.x, r.y, r.w, r.h) || g.keyp('Digit' + (i + 1))) { q.pick = i; answer(g, i === q.ans, i === q.ans ? '정확해요!' : '틀렸어요!'); return; } }
      return;
    }
    // 선택형 (person, first, year, era, who)
    if (q.type === 'person' && q.shown < 3 && (g.keyp('KeyH') || g.clickIn(760, 236, 170, 40))) { q.shown++; q.used++; g.sfx.click(); }
    for (let i = 0; i < q.choices.length; i++) {
      const r = choiceRect(i, q.type === 'person');
      if (g.clickIn(r.x, r.y, r.w, r.h) || g.keyp('Digit' + (i + 1))) { q.pick = i; answer(g, i === q.ans, i === q.ans ? '정답!' : '오답!'); return; }
    }
  },
  draw(g, c) {
    // 배경: 한지 느낌
    g.rect(0, 0, 960, 640, '#2a1d14');
    for (let i = 0; i < 8; i++) g.rect(0, i * 80, 960, 40, 'rgba(255,240,210,0.015)');
    if (S.phase === 'select') return drawSelect(g, c);
    const q = S.q;
    // 상단 HUD
    g.rrect(16, 12, 928, 56, 14, '#3b2a1c', '#7c5a3a', 2);
    g.text(HI_TYPES[q.type], 34, 40, 20, '#fde68a', 'left');
    g.text(`문제 ${S.qn + 1} / ${S.total}`, 400, 40, 18, '#f5e6c8');
    for (let i = 0; i < 3; i++) g.emoji(i < S.lives ? '❤️' : '🖤', 560 + i * 30, 40, 22);
    g.text(S.combo >= 2 ? `🔥 ${S.combo} 콤보` : `Lv.${S.lv}`, 760, 40, 18, S.combo >= 2 ? '#fb923c' : '#d6c4a4');
    g.text(`✅ ${S.correct}`, 920, 40, 18, '#86efac', 'right');
    // 타이머
    const tr = S.t / S.tMax;
    g.rrect(16, 76, 928, 10, 5, '#3b2a1c');
    g.rrect(16, 76, Math.max(10, 928 * tr), 10, 5, tr < 0.25 ? '#ef4444' : tr < 0.5 ? '#f59e0b' : '#84cc16');
    if (q.type === 'order') drawOrder(g, q);
    else if (q.type === 'timeline') drawTimeline(g, q);
    else drawChoice(g, q);
    // 피드백
    if (S.phase === 'fb') {
      const a = Math.min(1, (2.4 - S.fb) * 4);
      c.globalAlpha = a;
      g.rrect(300, 588, 360, 44, 14, S.fbOk ? '#166534' : '#7f1d1d', S.fbOk ? '#4ade80' : '#f87171', 2);
      g.text(S.fbMsg + (S.fb < 1.6 ? '  ▶ 클릭' : ''), 480, 611, 20, '#fff');
      c.globalAlpha = 1;
    }
  },
});

function modeRect(i) { return { x: 90 + (i % 2) * 400, y: 200 + Math.floor(i / 2) * 190, w: 380, h: 170 }; }
function drawSelect(g, c) {
  g.emoji('🏯', 480, 70, 56);
  g.text('한국사 퀴즈', 480, 128, 40, '#fde68a');
  g.text('모드를 선택하세요 (클릭 또는 숫자키)', 480, 168, 17, '#d6c4a4');
  HI_MODES.forEach((m, i) => {
    const r = modeRect(i), hov = g.inRect(r.x, r.y, r.w, r.h);
    g.rrect(r.x, r.y + (hov ? -4 : 0), r.w, r.h, 18, hov ? '#5b4029' : '#3b2a1c', hov ? '#fde68a' : '#7c5a3a', 3);
    g.emoji(m.e, r.x + 70, r.y + 85 + (hov ? -4 : 0), 60);
    g.text(`${i + 1}. ${m.n}`, r.x + 130, r.y + 65 + (hov ? -4 : 0), 26, '#fff7e6', 'left');
    g.text(m.d, r.x + 130, r.y + 105 + (hov ? -4 : 0), 15, '#d6c4a4', 'left', '500');
  });
  g.text(`사건 ${HI_EV.length}개 · 인물 ${HI_PP.length}명 수록`, 480, 600, 14, '#a8927a');
}
function startMode(g, m) {
  S.mode = m; S.total = m.total; S.phase = 'q'; S.qn = 0; S.lives = 3; S.combo = 0; S.correct = 0; S.lv = 1;
  g.sfx.power();
  makeQ(g);
}
function nextQ(g) {
  S.qn++;
  if (S.qn >= S.total) { g.win(`${S.mode.n} 완주! 정답 ${S.correct}/${S.total} · 최고 콤보 ${S.maxCombo}`); S.phase = 'end'; return; }
  const nl = 1 + Math.floor(S.qn / (S.total / 5));
  if (nl > S.lv) { S.lv = nl; g.float(480, 300, `난이도 UP! Lv.${S.lv}`, '#fde68a', 34); g.sfx.power(); }
  S.phase = 'q';
  makeQ(g);
}
function answer(g, ok, msg) {
  const q = S.q;
  S.phase = 'fb'; S.fb = 2.4; S.fbOk = ok;
  if (ok) {
    S.combo++; S.correct++; S.maxCombo = Math.max(S.maxCombo, S.combo);
    let pts = Math.round((100 + S.lv * 25 + S.t * 6) * (1 + Math.min(S.combo - 1, 10) * 0.1));
    if (q.type === 'person') pts = Math.max(40, pts - (q.shown - 1) * 35);
    if (q.type === 'order') pts += q.items.length * 20;
    g.add(pts, 480, 300);
    S.fbMsg = `${msg} +${pts}`;
    g.sfx.coin();
    g.burst(480, 300, ['#fde68a', '#facc15', '#86efac'], 30, 280, 0.8, 4);
  } else {
    S.combo = 0; S.lives--;
    S.fbMsg = msg;
    g.sfx.hit(); g.shake(8, 0.3);
    if (S.lives <= 0) { S.fb = 99; g.later(() => g.over(`${S.mode.n} · ${S.qn + 1}번째 문제에서 탈락 · 정답 ${S.correct}개`), 1.8); }
  }
}
// ───── 문제 생성 ─────
function pickEvents(n, gap) {
  for (let tries = 0; tries < 200; tries++) {
    const arr = [];
    const pool = U.shuffle(HI_EV.slice());
    for (const ev of pool) {
      if (arr.length >= n) break;
      if (arr.every((a) => Math.abs(a.y - ev.y) >= gap) && !S.recent.includes(ev)) arr.push(ev);
    }
    if (arr.length >= n) { S.recent.push(...arr); if (S.recent.length > 40) S.recent.splice(0, S.recent.length - 40); return arr; }
    gap = Math.max(1, Math.floor(gap * 0.7));
    if (tries > 5) S.recent.length = 0;
  }
  return U.shuffle(HI_EV.slice()).slice(0, n);
}
function gapFor(lv) { return [0, 90, 45, 20, 8, 3][Math.min(5, lv)]; }
function makeQ(g) {
  const k = S.mode.k, lv = S.lv;
  let type = k;
  if (k === 'mix') type = U.choice(['order', 'person', 'timeline', 'first', 'year', 'era', 'who', 'order', 'person']);
  if (k === 'person' && Math.random() < 0.3) type = 'who';
  if (k === 'order' && lv >= 3 && Math.random() < 0.25) type = 'first';
  let q;
  if (type === 'order') {
    const n = lv >= 4 ? 5 : 4;
    q = { type, items: U.shuffle(pickEvents(n, gapFor(lv))), picks: [] };
    S.tMax = 22 + n * 4;
  } else if (type === 'timeline') {
    const m = lv >= 3 ? 4 : 3;
    const evs = pickEvents(m + 1, gapFor(lv));
    const card = evs.pop();
    evs.sort((a, b) => a.y - b.y);
    let ans = evs.findIndex((e) => e.y > card.y); if (ans < 0) ans = evs.length;
    q = { type, placed: evs, card, ans, pick: -1 };
    S.tMax = 22;
  } else if (type === 'person' || type === 'who') {
    let p; for (let i = 0; i < 50; i++) { p = U.choice(HI_PP); if (!S.recentP.includes(p)) break; }
    S.recentP.push(p); if (S.recentP.length > 30) S.recentP.shift();
    const near = HI_PP.filter((x) => x !== p && Math.abs(x.era - p.era) <= (lv >= 3 ? 0 : 1));
    const far = HI_PP.filter((x) => x !== p && !near.includes(x));
    const ds = U.shuffle(near).slice(0, 3);
    while (ds.length < 3) ds.push(U.shuffle(far).pop());
    const choices = U.shuffle([p, ...ds]).map((x) => x.n);
    q = { type, p, choices, ans: choices.indexOf(p.n), shown: type === 'who' ? 3 : 1, used: 0, pick: -1, hint: type === 'who' ? U.randi(0, 1) : 0 };
    S.tMax = type === 'who' ? 15 : 20;
  } else if (type === 'first') {
    const evs = pickEvents(4, gapFor(lv));
    const last = Math.random() < 0.4;
    const sorted = evs.slice().sort((a, b) => a.y - b.y);
    const target = last ? sorted[3] : sorted[0];
    q = { type, prompt: last ? '다음 중 가장 나중에 일어난 사건은?' : '다음 중 가장 먼저 일어난 사건은?', choices: evs.map((e) => e.t), evs, ans: evs.indexOf(target), pick: -1 };
    S.tMax = 18;
  } else if (type === 'year') {
    const ev = pickEvents(1, 0)[0];
    const spread = [0, 60, 30, 12, 6, 3][Math.min(5, lv)];
    const ys = new Set([ev.y]);
    while (ys.size < 4) { const o = U.randi(-spread, spread); if (o !== 0 && ev.y + o !== 0) ys.add(ev.y + o); }
    const arr = U.shuffle([...ys]);
    q = { type, prompt: '이 사건이 일어난 해는?', sub: ev.t, choices: arr.map(yearStr), ans: arr.indexOf(ev.y), ev, pick: -1 };
    S.tMax = 16;
  } else {
    let ev; for (let i = 0; i < 100; i++) { ev = pickEvents(1, 0)[0]; if (hiEra(ev.y - 4) === hiEra(ev.y + 4)) break; }
    const eras = [ev.era];
    const others = U.shuffle([0, 1, 2, 3, 4, 5, 6, 7].filter((e) => e !== ev.era)).sort((a, b) => Math.abs(a - ev.era) - Math.abs(b - ev.era));
    eras.push(...others.slice(0, 3));
    const arr = U.shuffle(eras);
    q = { type: 'era', prompt: '이 사건은 어느 시대에 일어났을까?', sub: ev.t, choices: arr.map((e) => HI_ERAS[e]), ans: arr.indexOf(ev.era), ev, pick: -1 };
    S.tMax = 14;
  }
  S.q = q; S.t = S.tMax;
}
function yearStr(y) { return y < 0 ? `기원전 ${-y}년` : `${y}년`; }
function pickOrder(g, i) {
  const q = S.q, j = q.picks.indexOf(i);
  if (j >= 0) { q.picks.splice(j, 1); g.sfx.move(); return; }
  q.picks.push(i); g.sfx.click();
  const r = orderRect(i, q.items.length); g.burst(r.x + r.w / 2, r.y + 20, '#fde68a', 8, 120, 0.4, 3);
  if (q.picks.length === q.items.length) {
    let ok = true;
    for (let k = 1; k < q.picks.length; k++) if (q.items[q.picks[k]].y < q.items[q.picks[k - 1]].y) ok = false;
    answer(g, ok, ok ? '완벽한 순서!' : '순서가 틀렸어요!');
  }
}
// ───── 그리기 ─────
function wrapLines(g, s, maxW, size) {
  const key = s + '|' + maxW + '|' + size;
  let r = HI_WRAP.get(key);
  if (r) return r;
  const c = g.ctx;
  c.font = `bold ${size}px "Pretendard", system-ui, -apple-system, "Segoe UI", sans-serif`;
  const words = s.split(' '); r = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (c.measureText(t).width > maxW && cur) { r.push(cur); cur = w; } else cur = t;
    while (c.measureText(cur).width > maxW && cur.length > 1) { let k = cur.length - 1; while (k > 1 && c.measureText(cur.slice(0, k)).width > maxW) k--; r.push(cur.slice(0, k)); cur = cur.slice(k); }
  }
  if (cur) r.push(cur);
  if (HI_WRAP.size > 800) HI_WRAP.clear();
  HI_WRAP.set(key, r);
  return r;
}
function textBox(g, s, cx, cy, maxW, size, col, lh = 1.3) {
  const ls = wrapLines(g, s, maxW, size), h = ls.length * size * lh;
  ls.forEach((l, i) => g.text(l, cx, cy - h / 2 + size * lh * (i + 0.5), size, col));
}
function choiceRect(i, person) { return person ? { x: 60 + (i % 2) * 430, y: 300 + Math.floor(i / 2) * 135, w: 410, h: 118 } : { x: 60 + (i % 2) * 430, y: 270 + Math.floor(i / 2) * 150, w: 410, h: 132 }; }
function drawChoice(g, q) {
  const fb = S.phase === 'fb';
  if (q.type === 'person' || q.type === 'who') {
    g.rrect(40, 100, 880, 180, 16, '#f5e6c8', '#a16207', 3);
    g.text(q.type === 'who' ? '이 업적의 주인공은 누구일까요?' : '이 인물은 누구일까요?', 64, 124, 18, '#7c2d12', 'left');
    if (q.type === 'who') textBox(g, '“' + q.p.h[2 - q.hint] + '”', 480, 200, 820, 26, '#3b2a1c');
    else for (let i = 0; i < 3; i++) {
      const y = 160 + i * 40;
      if (i < q.shown) { g.text(`힌트 ${i + 1}`, 64, y, 15, '#a16207', 'left'); g.text(q.p.h[i], 140, y, i === q.shown - 1 && S.anim % 1 < 0.5 && !fb ? 20 : 20, '#3b2a1c', 'left'); }
      else g.text(`힌트 ${i + 1} · ${Math.ceil((i * 6) - (S.tMax - S.t))}초 뒤 공개`, 64, y, 15, '#b8a383', 'left', '500');
    }
    if (q.type === 'person' && q.shown < 3 && !fb) g.button(760, 236, 170, 40, '💡 힌트 (H)', '#92400e', 16);
    if (fb) g.text(`시대: ${HI_ERAS[q.p.era]}`, 900, 124, 15, HI_ERA_C[q.p.era], 'right');
  } else {
    g.rrect(40, 100, 880, 150, 16, '#f5e6c8', '#a16207', 3);
    g.text(q.prompt, 480, q.sub ? 132 : 175, q.sub ? 20 : 28, '#7c2d12');
    if (q.sub) textBox(g, q.sub, 480, 192, 820, 28, '#3b2a1c');
  }
  q.choices.forEach((ch, i) => {
    const r = choiceRect(i, q.type === 'person' || q.type === 'who'), hov = !fb && g.inRect(r.x, r.y, r.w, r.h);
    let col = hov ? '#5b4029' : '#3b2a1c', st = hov ? '#fde68a' : '#7c5a3a';
    if (fb) { if (i === q.ans) { col = '#166534'; st = '#4ade80'; } else if (i === q.pick) { col = '#7f1d1d'; st = '#f87171'; } }
    g.rrect(r.x, r.y, r.w, r.h, 14, col, st, 3);
    g.circle(r.x + 30, r.y + r.h / 2, 16, 'rgba(0,0,0,.35)');
    g.text(String(i + 1), r.x + 30, r.y + r.h / 2, 18, '#fde68a');
    const big = q.type === 'person' || q.type === 'who' || q.type === 'year' || q.type === 'era';
    textBox(g, ch, r.x + r.w / 2 + 18, r.y + r.h / 2, r.w - 80, big ? 26 : 19, '#fff7e6');
    if (fb && q.type === 'first') g.text(yearStr(q.evs[i].y), r.x + r.w - 14, r.y + r.h - 16, 14, '#fde68a', 'right');
  });
}
function orderRect(i, n) { const w = n === 5 ? 168 : 205, gap = n === 5 ? 12 : 18, x0 = 480 - (n * w + (n - 1) * gap) / 2; return { x: x0 + i * (w + gap), y: 250, w, h: 240 }; }
function drawOrder(g, q) {
  const fb = S.phase === 'fb';
  g.rrect(40, 100, 880, 120, 16, '#f5e6c8', '#a16207', 3);
  g.text('오래된 사건부터 순서대로 클릭하세요', 480, 140, 26, '#7c2d12');
  g.text(`(${q.picks.length}/${q.items.length} 선택 · 다시 클릭하면 취소 · Backspace 되돌리기)`, 480, 182, 15, '#92400e', 'center', '500');
  const sorted = q.items.slice().sort((a, b) => a.y - b.y);
  q.items.forEach((ev, i) => {
    const r = orderRect(i, q.items.length), k = q.picks.indexOf(i), hov = !fb && g.inRect(r.x, r.y, r.w, r.h);
    let col = k >= 0 ? '#5b4029' : hov ? '#4a3524' : '#3b2a1c', st = k >= 0 ? '#fde68a' : '#7c5a3a';
    const realRank = sorted.indexOf(ev);
    if (fb) { const ok = k === realRank; col = ok ? '#166534' : '#7f1d1d'; st = ok ? '#4ade80' : '#f87171'; }
    const dy = hov ? -6 : 0;
    g.rrect(r.x, r.y + dy, r.w, r.h, 14, col, st, 3);
    g.rect(r.x + 10, r.y + dy + 10, r.w - 20, 6, HI_ERA_C[ev.era]);
    textBox(g, ev.t, r.x + r.w / 2, r.y + dy + 120, r.w - 26, 18, '#fff7e6');
    g.text(`${i + 1}`, r.x + 18, r.y + dy + 34, 14, '#a8927a', 'left');
    if (k >= 0) { g.circle(r.x + r.w - 26, r.y + dy + 36, 20, '#fde68a'); g.text(String(k + 1), r.x + r.w - 26, r.y + dy + 37, 22, '#3b2a1c'); }
    if (fb) { g.text(yearStr(ev.y), r.x + r.w / 2, r.y + r.h - 44, 20, '#fde68a'); g.text(`정답 ${realRank + 1}번째`, r.x + r.w / 2, r.y + r.h - 20, 14, '#e7d5b5', 'center', '500'); }
  });
  // 아래 화살표
  g.line(80, 530, 880, 530, '#7c5a3a', 3);
  g.poly([[880, 520], [900, 530], [880, 540]], '#7c5a3a');
  g.text('과거', 80, 556, 14, '#a8927a'); g.text('현재', 880, 556, 14, '#a8927a');
}
function gapRect(i, n) {
  const cw = n === 4 ? 160 : 185, gw = 52, total = n * cw + (n + 1) * gw, x0 = 480 - total / 2;
  return { x: x0 + i * (cw + gw), y: 440, w: gw, h: 90, cw };
}
function drawTimeline(g, q) {
  const fb = S.phase === 'fb', n = q.placed.length;
  g.rrect(40, 100, 880, 170, 16, '#f5e6c8', '#a16207', 3);
  g.text('이 사건은 연표의 어디에 들어갈까요?', 480, 128, 18, '#7c2d12');
  g.rrect(190, 150, 580, 104, 12, '#fff7e6', HI_ERA_C[q.card.era], 3);
  textBox(g, q.card.t, 480, 196, 540, 24, '#3b2a1c');
  if (fb) g.text(yearStr(q.card.y), 760, 240, 16, '#b45309', 'right');
  // 연표 선
  g.line(40, 485, 920, 485, '#d6b98c', 4);
  for (let i = 0; i <= n; i++) {
    const r = gapRect(i, n), hov = !fb && g.inRect(r.x, r.y, r.w, r.h);
    let col = hov ? '#fde68a' : '#7c5a3a';
    if (fb) col = i === q.ans ? '#4ade80' : i === q.pick ? '#f87171' : '#5b4029';
    g.rrect(r.x + 4, r.y + 8, r.w - 8, r.h - 16, 12, col, '#2a1d14', 2);
    g.text(fb && i === q.ans ? '✔' : '+', r.x + r.w / 2, r.y + r.h / 2, 26, '#2a1d14');
    g.text(String(i + 1), r.x + r.w / 2, r.y + r.h + 12, 13, '#a8927a');
    if (i < n) {
      const ev = q.placed[i], cx = r.x + r.w, cw = r.cw;
      g.rrect(cx + 4, 300, cw - 8, 120, 12, '#3b2a1c', '#7c5a3a', 2);
      g.rect(cx + 14, 308, cw - 28, 5, HI_ERA_C[ev.era]);
      textBox(g, ev.t, cx + cw / 2, 360, cw - 24, 15, '#fff7e6');
      g.line(cx + cw / 2, 420, cx + cw / 2, 475, '#7c5a3a', 2);
      g.circle(cx + cw / 2, 485, 8, '#fde68a');
      g.text(yearStr(ev.y), cx + cw / 2, 512, 16, '#fde68a');
    }
  }
  g.text('◀ 과거', 60, 580, 15, '#a8927a', 'left'); g.text('현재 ▶', 900, 580, 15, '#a8927a', 'right');
}
