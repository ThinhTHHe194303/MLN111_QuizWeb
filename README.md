# Ôn tập Triết học Mác – Lênin

Ứng dụng trắc nghiệm tiếng Việt bằng HTML, CSS và JavaScript ES modules thuần. Không cần backend, database, thư viện bên thứ ba hay bước build; mọi thứ chạy trong trình duyệt.

## Chạy nhanh

Cần Node.js ≥ 20 (không cần `npm install`):

```bash
npm start        # http://localhost:8000
npm test         # 29 kiểm tra logic
npm run validate # kiểm tra src/data/questions.json
```

Không mở `index.html` bằng `file://` vì ứng dụng dùng ES modules và `fetch`. Có thể dùng bất kỳ máy chủ tĩnh nào trỏ vào thư mục `src/`.

## Cấu trúc

```text
src/                     # Thư mục xuất bản (xem DEPLOY.md)
  index.html             # Khung trang, header, dialog xác nhận
  favicon.svg
  css/
    tokens.css           # Biến màu/bo góc, giao diện sáng + tối
    base.css             # Reset, typography, header/footer
    components.css       # Nút, form, switch, dialog, banner...
    views.css            # Dashboard, làm bài, kết quả, responsive
  js/
    main.js              # Điểm vào: tải dữ liệu, khởi tạo
    controller.js        # Trạng thái + xử lý sự kiện + điều phối view
    config.js            # Hằng số, giá trị mặc định
    core/                # Logic thuần, không đụng DOM/storage (có unit test)
      quiz.js            # Validate, xáo (Fisher–Yates), dựng đề, chấm điểm
      settings.js        # Chuẩn hóa/kiểm tra cấu hình
      session.js         # Phiên làm bài: đồng hồ, lưu/khôi phục, lịch sử
    services/storage.js  # localStorage an toàn, tự rơi về bộ nhớ nếu bị chặn
    ui/                  # Chỉ dựng HTML/cập nhật DOM
      dashboard.js  quiz.js  results.js  dialog.js  theme.js
    utils/               # esc (chống XSS), định dạng, DOM helper
  data/questions.json    # 3 chương, 45 câu
scripts/
  serve.mjs              # Máy chủ tĩnh dev
  validate-data.mjs      # Kiểm tra ngân hàng câu hỏi
tests/                   # node:test
```

Quy tắc phân lớp: `core` không phụ thuộc gì ngoài `config`; `ui` chỉ nhận dữ liệu và trả về HTML; `controller` là nơi duy nhất giữ trạng thái và gắn sự kiện.

## Chức năng

- **Chọn chương** (một hoặc nhiều), nút "Ôn riêng chương này", số câu tùy chọn hoặc toàn bộ.
- **Hai chế độ**: *Kiểm tra* (xem đáp án sau khi nộp) và *Luyện tập* (xem đáp án + giải thích ngay, câu đã trả lời bị khóa).
- **Đảo câu hỏi / đáp án** độc lập; chấm theo ID đáp án cố định, không theo chữ cái hiển thị.
- **Đồng hồ đếm ngược** 1–180 phút theo mốc thời gian tuyệt đối, tự nộp khi hết giờ (kể cả khi hộp xác nhận đang mở). Không bật đồng hồ thì hiển thị thời gian đã làm (chỉ tính thời gian thực sự làm bài).
- **Tự lưu và tiếp tục**: câu trả lời, cờ đánh dấu, vị trí, thứ tự đáp án được lưu mỗi thao tác; tải lại hoặc rời trang vẫn có nút "Tiếp tục làm bài". Cài đặt cũng được nhớ.
- **Phím tắt**: `A–D` / `1–4` chọn đáp án, `←` `→` chuyển câu, `F` đánh dấu.
- **Kết quả**: điểm /10, thống kê đúng/sai/trống, kết quả theo chương, bộ lọc xem lại (sai, chưa trả lời, đánh dấu) kèm giải thích và mục tham chiếu.
- **Ôn lại câu chưa đúng** (sai + bỏ trống) chỉ bằng một nút; **Làm lại bài mới**.
- **Lịch sử** 20 bài gần nhất trên thiết bị (có thể xóa).
- **Giao diện** sáng/tối (theo hệ thống, có nút chuyển), responsive, hỗ trợ bàn phím và đọc màn hình (ARIA, quản lý focus, tôn trọng `prefers-reduced-motion`).

Điểm = số đúng / tổng câu × 10 (làm tròn 1 chữ số). Câu sai và câu trống đều 0 điểm.

## Thêm hoặc thay câu hỏi

Sửa `src/data/questions.json` (UTF-8) rồi chạy `npm run validate`. Mỗi chương có `id`, `title`, `description`, `questions`. Mỗi câu:

```json
{
  "id": "chuong-1-q99",
  "question": "Vấn đề cơ bản của triết học là gì?",
  "options": [
    {"id": "A", "text": "Quan hệ giữa vật chất và ý thức"},
    {"id": "B", "text": "Quan hệ giữa cung và cầu"},
    {"id": "C", "text": "Quan hệ giữa cá nhân và tập thể"},
    {"id": "D", "text": "Quan hệ giữa đạo đức và pháp luật"}
  ],
  "correctAnswer": "A",
  "explanation": "Vấn đề cơ bản của triết học là quan hệ giữa vật chất và ý thức.",
  "source": "Chương 1 · I.2 · Vấn đề cơ bản của triết học"
}
```

ID chương/câu phải duy nhất; mỗi câu có đúng 4 lựa chọn A–D; `correctAnswer` tham chiếu ID gốc (đừng sửa theo chữ cái hiển thị sau khi xáo). Nếu đã có người đang làm dở một bài, câu hỏi bị xóa/đổi ID sẽ khiến bài dở đó bị bỏ qua an toàn (không gây lỗi).

Nguồn dữ liệu: *Giáo trình Triết học M-L – 2021* do người dùng cung cấp. Đây là câu hỏi tự biên soạn để ôn tập, không phải đề thi chính thức và chưa bao quát toàn bộ tài liệu.

## Kiểm thử

`npm test` bao phủ: schema/ID dữ liệu, dựng đề và chọn chương/số câu, xáo trộn, chấm điểm (kể cả bài rỗng), câu sai/bỏ trống để ôn lại, lưu/khôi phục phiên (snapshot hỏng/lỗi thời), đồng hồ có tạm dừng, chuẩn hóa cài đặt, storage bị chặn/hỏng, và hàm escape HTML. Luồng giao diện (chọn chương → luyện tập → phím tắt → rời/tiếp tục → nộp → lọc → ôn câu sai → lịch sử → đổi theme) đã được kiểm tra bằng jsdom khi phát triển; chưa có kiểm thử trình duyệt thật nên hãy thử nhanh trên điện thoại và bằng phím Tab sau khi triển khai.

## Lưu ý

- Dữ liệu lưu trong `localStorage` của trình duyệt; nếu bị chặn, ứng dụng vẫn chạy nhưng bài làm mất khi tải lại (có cảnh báo).
- Đây là ứng dụng phía client: JSON câu hỏi đọc được trong DevTools, không phù hợp làm hệ thống thi chống gian lận.
- Xem **DEPLOY.md** để đưa lên GitHub Pages, Vercel hoặc Netlify.
