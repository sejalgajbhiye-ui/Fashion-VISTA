# Fashion VISTA — Dataset Inventory & Model Preparation

Comprehensive catalog of datasets, schemas, validation results, access requirements, and AI/ML model mappings for **Fashion VISTA**.

---

## 1. Executive Summary Table

| Dataset | Primary File | Rows | Columns | Verified Images | Download Status | License |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **Fashion-MNIST** | `fashion_mnist_labels.csv` | 70,000 | 5 | 7,000 | Downloaded & Verified | MIT (Permissive Open Source) |
| **DeepFashion** | `deepfashion_attributes.csv` | 0 | 0 | 0 | Requires CUHK Registration & Password | Non-Commercial Research (Signed Agreement) |
| **Fashion Product Images** | `fashion_products.csv` | 0 | 0 | 0 | Requires Kaggle Authentication (~/.kaggle/kaggle.json) | CC0: Public Domain |
| **VITON-HD** | `viton_hd_pairs.csv` | 0 | 0 | 0 | Awaiting User Approval & Disk Space Allocation (~25GB) | CC BY-NC 4.0 (Non-Commercial) |

---

## 2. Dataset Detailed Profiles & Validation

### Dataset A: Fashion-MNIST
- **Official Source**: [Zalando Research GitHub](https://github.com/zalandoresearch/fashion-mnist)
- **Official Mirrors**: `http://fashion-mnist.s3-website.eu-central-1.amazonaws.com/`
- **Purpose**: Baseline clothing image classification (benchmark standard).
- **Nature of Data**: 28x28 grayscale images across 10 categories.
  > **Note**: Fashion-MNIST contains small silhouette/isolated item thumbnails and is intended as a rapid algorithmic baseline, not a replacement for a rich product catalog.
- **Download Status**: **Completed & Verified**
- **Validation Metrics**:
  - Total Samples: `70,000` (Train: `60,000`, Test: `10,000`)
  - Missing Values: `0`
  - Duplicate IDs: `0`
  - Verified Disk Images: `7,000` PNGs in `datasets/fashion_mnist/processed/images/`
  - Broken Paths: `0`
- **Class Distribution (7,000 per class, perfectly balanced)**:
  - `Ankle boot`: 7,000 images
  - `T-shirt/top`: 7,000 images
  - `Dress`: 7,000 images
  - `Pullover`: 7,000 images
  - `Sneaker`: 7,000 images
  - `Sandal`: 7,000 images
  - `Trouser`: 7,000 images
  - `Shirt`: 7,000 images
  - `Coat`: 7,000 images
  - `Bag`: 7,000 images
- **CSV Schema (`datasets/fashion_mnist/csv/fashion_mnist_labels.csv`)**:
  - `image_id`: Unique identifier (e.g., `fmnist_train_00000`)
  - `label`: Integer class index (0–9)
  - `category`: Canonical name (T-shirt/top, Trouser, Pullover, Dress, Coat, Sandal, Shirt, Sneaker, Bag, Ankle boot)
  - `split`: Official partition (`train` or `test`)
  - `image_path`: Relative path to exported PNG file (empty for compact storage rows)

---

### Dataset B: DeepFashion
- **Official Source**: [CUHK Multimedia Lab DeepFashion](http://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html)
- **Purpose**: Fine-grained clothing attribute prediction, category recognition, and landmark localization.
- **License**: Restricted academic / non-commercial research agreement.
- **Status**: **Pending User Registration & CUHK Agreement**
- **Exact Access Instructions**:
  1. Visit the [DeepFashion Agreement Form](http://mmlab.ie.cuhk.edu.hk/projects/DeepFashion/DeepFashionAgreement.pdf).
  2. Complete the release agreement (academic / non-commercial use only).
  3. Send the signed form to **Ziwei Liu** (`zwliu.hust@gmail.com`) and CC **Ping Luo** with subject **"DeepFashion Agreement"**.
  4. Upon receiving archive decryption passwords, download the files from Google Drive:
     `https://drive.google.com/drive/folders/0B7EVK8r0v71pQ2FuZ0k0QnhBQnc`
  5. Unpack `list_category_cloth.txt`, `list_attr_cloth.txt`, `list_category_img.txt`, and `list_eval_partition.txt` into `datasets/deepfashion/raw/`.
  6. Run `python scripts/process_deepfashion.py` to generate `datasets/deepfashion/csv/deepfashion_attributes.csv`.
- **Target CSV Schema**:
  - `image_id`: Preserved or mapped ID (e.g., `df_000001`)
  - `image_path`: Path within DeepFashion image hierarchy (e.g., `img/Sheer_Pleated-Front_Blouse/img_00000001.jpg`)
  - `category`: Fine-grained garment category (50 categories: Blouse, Dress, Anorak, Blazer, etc.)
  - `attribute_labels`: Semicolon-separated active attribute strings (texture, shape, fabric, style)
  - `split`: Official partition (`train`, `val`, `test`)

---

### Dataset C: Fashion Product Images (Small)
- **Official Source**: [Kaggle Dataset: Param Aggarwal](https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-small)
- **Purpose**: E-commerce fashion product metadata, content-based outfit recommendations, and wardrobe matching.
- **Size**: ~570 MB (44,446 products with thumbnails and `styles.csv`).
- **License**: CC0: Public Domain
- **Status**: **Pending Kaggle API Configuration**
- **Secure Setup Instructions (Zero Secrets Committed)**:
  1. Go to [Kaggle Account Settings](https://www.kaggle.com/settings).
  2. Under **API**, click **Create New Token** to download `kaggle.json`.
  3. Place `kaggle.json` in your local user directory:
     `C:\Users\sejal\.kaggle\kaggle.json`
  4. Ensure permissions are restricted to your Windows user account.
  5. Run `python scripts/process_fashion_products.py` — it will automatically download, unpack, clean corrupted lines, and output `datasets/fashion_product_images/csv/fashion_products.csv`.
- **Target CSV Schema**:
  - `product_id`: Unique numeric product ID (e.g., `42431`)
  - `image_path`: Local thumbnail path (`datasets/fashion_product_images/raw/images/<built-in function id>.jpg`)
  - `category`: Master category (Apparel, Footwear, Accessories, Personal Care)
  - `subcategory`: Subcategory (Topwear, Bottomwear, Shoes, Bags, etc.)
  - `colour`: Dominant item color
  - `season`: Target season (Summer, Fall, Winter, Spring)
  - `usage`: Context of use (Casual, Formal, Sports, Ethnic, Party)
  - `gender`: Target demographic (Men, Women, Boys, Girls, Unisex)
  - `article_type`: Specific garment type (Tshirts, Shirts, Jeans, Dresses)
  - `product_name`: Full catalog display title

---

### Dataset D: VITON-HD
- **Official Source**: [KAIST CVPR 2021 VITON-HD GitHub](https://github.com/shadow2496/VITON-HD)
- **Research Paper**: [arXiv:2103.16874](https://arxiv.org/abs/2103.16874)
- **Purpose**: High-resolution (1024x768) image-based virtual try-on.
- **License**: CC BY-NC 4.0 (Non-Commercial Research Only).
- **Status**: **Awaiting User Approval & Storage Allocation (~25 GB)**
- **Hardware & Storage Requirements**:
  - **Storage Requirement**: Compressed archive ~15 GB; uncompressed ~25 GB.
    > **Drive Warning**: Current free disk space on `C:` is **13.84 GB**. Downloading full VITON-HD will exhaust disk space. Requires external storage or freeing ~30 GB.
  - **GPU Requirement**: NVIDIA GPU with >= 12 GB VRAM (RTX 3080/3090, RTX 4080/4090, A100) and CUDA support.
- **Pretrained Weights**:
  - Pretrained checkpoints (`*.pkl`) available at:
    `https://drive.google.com/drive/folders/0B8kXrnobEVh9fnJHX3lCZzEtd20yUVAtTk5HdWk2OVV0RGl6YXc0NWhMOTlvb1FKX3Z1OUk`
- **Manifest Pipeline (`scripts/process_viton_hd.py`)**:
  - Once pairs are placed in `datasets/viton_hd/raw/`, it builds `viton_hd_pairs.csv` with:
    - `sample_id`: Manifest index (e.g., `viton_000001`)
    - `person_image_path`: Path to high-res subject image
    - `garment_image_path`: Path to target garment image
    - `split`: `train` (11,647 pairs) or `test` (2,032 pairs)

---

## 3. Machine Learning Architecture Roadmap

| Application Feature | Dataset Mapped | Model Approach | Input & Output |
| :--- | :--- | :--- | :--- |
| **Clothing Classification** | Fashion-MNIST & DeepFashion Categories | ResNet-18 / MobileNetV3 | **Input**: Garment image<br>**Output**: Garment class probabilities |
| **Attribute Prediction** | DeepFashion Attributes | Multi-label ResNet-50 / ViT with BCE loss | **Input**: Clothing image<br>**Output**: Attributes (fabric, pattern, cut, sleeve length) |
| **Outfit Recommendations** | Fashion Product Images (`fashion_products.csv`) | Content-based filtering + ResNet/CLIP visual embeddings | **Input**: Selected product ID + user style preference<br>**Output**: Ranked list of complementary pieces |
| **Wardrobe Matching** | Fashion Products + User Wardrobe (`wardrobeData.js`) | Cosine similarity on normalized color/category/embedding features | **Input**: User's owned items<br>**Output**: Wardrobe compatibility score (0–100%) |
| **Virtual Try-On** | VITON-HD | ALIAS Generator (CVPR 2021) / StableVITON | **Input**: User photo + target cloth image<br>**Output**: 1024x768 realistic synthesized try-on image |

---

## 4. Git Hygiene & Confidentiality

- **Ignored from Git**:
  - `datasets/` (entire directory containing raw archives, unpacked files, and image folders)
  - `*.gz`, `*.zip`, `*.tar`, `*.tar.gz`
  - `checkpoints/`, `*.pkl`, `*.pth`, `*.pt`, `*.bin`, `*.onnx`
  - `.kaggle/` and `kaggle.json` (zero secrets committed)
- **Frontend Preservation**:
  - All existing React components, pages ([`Home.jsx`](file:///C:/Users/sejal/.gemini/antigravity/scratch/Fashion-VISTA/src/pages/Home.jsx), [`Wardrobe.jsx`](file:///C:/Users/sejal/.gemini/antigravity/scratch/Fashion-VISTA/src/pages/Wardrobe.jsx), [`Stylist.jsx`](file:///C:/Users/sejal/.gemini/antigravity/scratch/Fashion-VISTA/src/pages/Stylist.jsx), [`VirtualTryOn.jsx`](file:///C:/Users/sejal/.gemini/antigravity/scratch/Fashion-VISTA/src/pages/VirtualTryOn.jsx)), Tailwind styling, and assets remain completely untouched.
