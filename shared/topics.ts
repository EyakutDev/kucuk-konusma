// Light, low-risk small-talk questions. One is shown at a time on the topic card.
export const TOPICS: readonly string[] = [
  "Çocukken ne olmak isterdin?",
  "Son zamanlarda seni güldüren şey neydi?",
  "Bir hafta başka bir şehirde yaşasan, nereyi seçerdin?",
  "Kahvaltıda olmazsa olmazın ne?",
  "Bu yıl öğrendiğin küçük ama işe yarar bir şey?",
  "Hiç sıkılmadan tekrar izleyebileceğin bir film?",
  "Sıradan ama sahip olmak istediğin bir yetenek?",
  "En sevdiğin mevsim hangisi, neden?",
  "Bir günlüğüne bir meslek deneyebilsen hangisi olurdu?",
  "Çay mı kahve mi? Savun bakalım.",
  "Seni en çok dinlendiren şey ne?",
  "En son hangi şarkıyı tekrar tekrar dinledin?",
  "Hayatında denediğin en tuhaf yemek neydi?",
  "Sabah insanı mısın, gece insanı mı?",
  "Bir hobiye başlamak için vaktin olsa, ne olurdu?",
  "Şu an bulunduğun yerde en sevdiğin köşe neresi?",
  "Telefonundaki en gereksiz ama silemediğin uygulama?",
  "Çocukluğundan kalma bir oyun ya da oyuncak?",
  "İdeal bir pazar günü nasıl geçer?",
  "En son ne zaman bir şeye çok güldün?",
  "Bir kitabın ya da dizinin içinde yaşayabilsen hangisi?",
  "Deniz mi, dağ mı?",
  "Unutamadığın bir seyahat anı?",
  "Bir süper güç değil, bir alışkanlık edinebilsen hangisi?",
  "Bugün seni mutlu eden küçük bir şey oldu mu?",
  "Evcil hayvan beslesen hangisini seçerdin?",
  "En iyi yaptığın yemek ne?",
  "Hiç tanımadığın birine verebileceğin bir tavsiye?",
  "Bir dil öğrenebilsen hangisini seçerdin?",
  "Yaz tatili denince aklına gelen ilk şey?",
  "En sevdiğin sokak yemeği?",
  "Bir müzik aleti çalabilsen hangisi olurdu?",
  "Hayalindeki ev nerede olurdu?",
  "Kendine aldığın en iyi hediye neydi?",
  "Yürüyüş mü, bisiklet mi, otobüs mü?",
  "Dünyada görmek istediğin tek bir yer?",
  "Hangi kokuyu sevmeden edemiyorsun?",
  "Biri sana bir saat boş zaman verse ne yapardın?",
  "En son öğrendiğin ilginç bilgi neydi?",
  "Uzun bir yolculukta yanına alacağın üç şey?",
];

export function randomTopicIndex(exclude?: number): number {
  if (TOPICS.length < 2) return 0;
  let i: number;
  do {
    i = Math.floor(Math.random() * TOPICS.length);
  } while (i === exclude);
  return i;
}
