# Hướng dẫn triển khai online

Đây là website tĩnh: không cần build, database, API key hoặc cài thư viện npm. Thư mục xuất bản là **src**. Sau khi giải nén, kiểm tra `src/index.html`, `src/css/`, `src/js/` và `src/data/questions.json` tồn tại. Cấu hình không sử dụng đường dẫn tuyệt đối từ gốc tên miền nên hoạt động cả trên GitHub Pages dạng `/ten-repository/`.

## Cách 1 — Netlify Drop

1. Đăng nhập Netlify và mở https://app.netlify.com/drop.
2. Kéo thư mục **src** vào vùng tải lên. Phải chọn thư mục trực tiếp chứa `index.html`, không phải thư mục cha `quiz-app`.
3. Chờ Netlify cung cấp URL, mở URL và thử làm một bài.
4. Để cập nhật, vào trang quản lý project, phần Deploys và tải lại thư mục src đã sửa.

Nếu kết nối Git repository chứa toàn bộ mã nguồn: bỏ trống Build command và đặt Publish directory là `src`. File `netlify.toml` đã khai báo thư mục này.

Tài liệu: https://docs.netlify.com/deploy/create-deploys/

## Cách 2 — GitHub Pages

Cách đơn giản nhất là dùng một repository riêng chỉ chứa nội dung của src:

1. Tạo public repository, ví dụ `quiz-triet-hoc`.
2. Upload **toàn bộ nội dung bên trong src** vào gốc repository. `index.html` phải ở gốc, không nằm trong một thư mục `src` lồng thêm.
3. Commit lên nhánh `main`.
4. Mở Settings → Pages → Build and deployment.
5. Chọn Source: **Deploy from a branch**; Branch: **main**; Folder: **/(root)**; Save.
6. Chờ quá trình xuất bản hoàn thành rồi mở URL Pages hiển thị, thường có dạng `https://<username>.github.io/quiz-triet-hoc/`.
7. Cập nhật bằng cách commit lại các file đã sửa; Pages xuất bản lại sau mỗi lần push.

Giữ `.nojekyll` để phục vụ trực tiếp file tĩnh. Nếu dùng repository chứa toàn bộ dự án, có thể copy nội dung src sang thư mục `docs` rồi chọn `main` + `/docs`; hoặc tự thiết lập GitHub Actions với artifact từ src. Giao diện chọn branch không cho chọn tùy ý thư mục src.

Tài liệu: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Cách 3 — Vercel

1. Đẩy toàn bộ thư mục dự án (nội dung quiz-app) lên repository GitHub.
2. Đăng nhập https://vercel.com, chọn Add New → Project và import repository.
3. Framework Preset: **Other**.
4. Root Directory: gốc repository. Build Command: để trống (bật Override và xóa nội dung nếu cần). Output Directory: **src**.
5. Chọn Deploy và mở URL sau khi deployment thành công.
6. Những lần push tiếp theo sẽ tạo deployment mới khi repository đã được kết nối.

File `vercel.json` đi kèm khai báo framework null, buildCommand rỗng và outputDirectory src. Nếu chỉ upload nội dung src vào repository, bỏ cấu hình này hoặc đổi Output Directory thành `.`.

Tài liệu: https://vercel.com/docs/builds/configure-a-build

## Kiểm tra sau deploy

- Mở URL gốc và kiểm tra đủ 3 chương, tổng 45 câu.
- Mở URL `data/questions.json` (cùng thư mục với index.html) để bảo đảm JSON trả về thành công.
- Chọn 2 chương, làm 5 câu và nộp; kiểm tra đúng/sai/trống và giải thích.
- Bật timer 1 phút để kiểm tra tự nộp; làm lại để kiểm tra reset.
- Kiểm tra màn hình điện thoại, nút đánh dấu và điều hướng câu.
- Nếu giao diện hoặc câu hỏi cũ còn hiển thị: tải lại không dùng cache hoặc thử cửa sổ riêng tư.
- Nếu gặp 404: kiểm tra thư mục xuất bản có index.html ngay bên trong.
- Nếu lỗi đọc JSON: kiểm tra cú pháp, chữ hoa/thường của tên file, UTF-8 và mở bằng HTTP/HTTPS thay cho file://.

Các nền tảng có gói miễn phí với giới hạn và điều kiện sử dụng riêng; hãy kiểm tra thông tin gói hiện hành trước khi chọn. Hướng dẫn dựa trên tài liệu chính thức đã đối chiếu khi tạo dự án. Không cần nhập thẻ hay mua dịch vụ chỉ để chạy mã nguồn trên máy của bạn.
