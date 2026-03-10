import { GoogleGenAI } from "@google/genai";

import { SaleRecord } from "../types";



export const getSalesInsights = async (records: SaleRecord[], customPrompt?: string): Promise<string> => {

  try {

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

   

    // 데이터를 요약하여 문자열로 변환합니다. Gemini Flash 모델의 긴 컨텍스트 윈도우를 활용하여 전체 데이터를 전달합니다.

    const summaryData = records.map(r =>

      `${r.date}, ${r.mallName}, ${r.koreanName}, 수량:${r.quantity}, 단가:${r.unitPrice}, 합계:${r.totalPrice}`

    ).join('\n');



    const defaultPrompt = `이 데이터를 분석하여 경영진 보고용 판매 분석 보고서를 작성해줘. 다음 목차와 구조를 반드시 따라줘:



1. 📊 판매 성과 요약 (핵심 지표 위주)

2. 📋 상세 데이터 분석 (반드시 마크다운 표 활용)

   - [표 1] 주요 상품별 판매 성과 (TOP 5)

   - [표 2] 카테고리/상품군별 판매 비중

   - [표 3] 채널별(쇼핑몰별) 판매 점유율

3. 💡 주요 분석 통찰 (Insights)

   - 데이터에서 발견된 급상승 트렌드나 특이사항

4. 🚀 전략적 제언 (Action Plan)



모든 수치 비교 데이터는 줄글 대신 **반드시 마크다운 표(Table)**로 작성하여 가독성을 극대화해줘.`;

   

    const finalPrompt = customPrompt

      ? `다음 판매 데이터를 바탕으로 사용자의 요청에 답해줘. 요청: ${customPrompt}\n\n데이터:\n${summaryData}`

      : `다음 판매 데이터를 분석해줘:\n${summaryData}\n\n${defaultPrompt}`;



    const response = await ai.models.generateContent({

      model: 'gemini-3-flash-preview',

      contents: finalPrompt,

      config: {

        systemInstruction: `당신은 이커머스 수석 데이터 분석가입니다. 제공된 실데이터(구글 시트 데이터)만을 기반으로 전문적인 분석 보고서를 작성하세요.



[보고서 작성 가이드라인]

1. **가독성 최우선 (Report Format)**: 줄글로 길게 나열하는 것을 피하고, **마크다운 표(Table)**와 **글머리 기호(Bulleted List)**를 적극적으로 사용하여 정보를 구조화하세요.

2. **테이블 필수 사용**:

   - 상품별 매출, 채널별 점유율, 일자별 추이 등 비교 가능한 수치 데이터는 반드시 **표**로 정리하여 보여주세요.

   - 표 상단에 **[표 1]**, **[표 2]**와 같이 번호를 붙여 참조하기 쉽게 만드세요.

3. **분석 깊이**:

   - 단순한 수치 나열을 넘어, 해당 수치가 갖는 의미(전주 대비 증가, 특정 채널 집중 등)를 해석하세요.

4. **팩트 기반**: 외부 지식보다는 주어진 데이터 내의 수치와 패턴에 집중하세요.

5. **강조**: 핵심 수치나 중요한 내용은 **굵게(Bold)** 표시하세요.`,

        temperature: 0.7,

      },

    });



    return response.text || "분석 결과를 가져올 수 없습니다.";

  } catch (error) {

    console.error("Gemini Insight Error:", error);

    return "AI 분석 중 오류가 발생했습니다. API 키 설정이나 데이터 형식을 확인해주세요.";

  }

};