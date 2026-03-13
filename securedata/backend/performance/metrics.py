import time
import numpy as np
from typing import Dict, Any
from dataclasses import dataclass
from skimage.metrics import structural_similarity as ssim
from PIL import Image
import io

@dataclass
class EncryptionMetrics:
    encryption_time_ms: float
    decryption_time_ms: float
    payload_size_bytes: int
    original_size_bytes: int
    encrypted_size_bytes: int

@dataclass
class StegoMetrics:
    psnr: float
    ssim: float
    payload_capacity_bytes: int
    embedding_time_ms: float
    extraction_time_ms: float
    file_size_before: int
    file_size_after: int

class PerformanceAnalyzer:
    """Analyze and track performance metrics for encryption and steganography"""
    
    def __init__(self):
        self.metrics_history = []
    
    def measure_encryption_performance(
        self, 
        encrypt_func, 
        decrypt_func,
        test_data: bytes,
        iterations: int = 5
    ) -> EncryptionMetrics:
        """Measure encryption/decryption performance"""
        enc_times = []
        dec_times = []
        
        # Warm up
        encrypted = encrypt_func(test_data)
        decrypt_func(encrypted)
        
        # Measure
        for _ in range(iterations):
            # Encryption time
            start = time.perf_counter()
            encrypted = encrypt_func(test_data)
            enc_times.append((time.perf_counter() - start) * 1000)
            
            # Decryption time
            start = time.perf_counter()
            decrypt_func(encrypted)
            dec_times.append((time.perf_counter() - start) * 1000)
        
        return EncryptionMetrics(
            encryption_time_ms=np.mean(enc_times),
            decryption_time_ms=np.mean(dec_times),
            payload_size_bytes=len(test_data),
            original_size_bytes=len(test_data),
            encrypted_size_bytes=len(encrypted) if isinstance(encrypted, (bytes, str)) else len(str(encrypted))
        )
    
    def measure_image_stego_performance(
        self,
        embed_func,
        extract_func,
        image_bytes: bytes,
        secret_text: str,
        password: str,
        iterations: int = 3
    ) -> StegoMetrics:
        """Measure image steganography performance"""
        from PIL import Image
        import io
        
        # Load original image
        original_img = Image.open(io.BytesIO(image_bytes))
        original_array = np.array(original_img)
        
        embed_times = []
        extract_times = []
        
        for _ in range(iterations):
            # Embedding time
            start = time.perf_counter()
            stego_bytes = embed_func(io.BytesIO(image_bytes), secret_text, password)
            embed_times.append((time.perf_counter() - start) * 1000)
            
            # Extraction time
            start = time.perf_counter()
            extract_func(io.BytesIO(stego_bytes), password)
            extract_times.append((time.perf_counter() - start) * 1000)
        
        # Calculate quality metrics (use last iteration)
        stego_img = Image.open(io.BytesIO(stego_bytes))
        stego_array = np.array(stego_img)
        
        # Ensure same size
        min_h = min(original_array.shape[0], stego_array.shape[0])
        min_w = min(original_array.shape[1], stego_array.shape[1])
        orig_crop = original_array[:min_h, :min_w]
        stego_crop = stego_array[:min_h, :min_w]
        
        # Calculate PSNR
        psnr = self.calculate_psnr(orig_crop, stego_crop)
        
        # Calculate SSIM
        if len(orig_crop.shape) == 3:
            ssim_value = ssim(orig_crop, stego_crop, multichannel=True, channel_axis=2, data_range=255)
        else:
            ssim_value = ssim(orig_crop, stego_crop, data_range=255)
        
        return StegoMetrics(
            psnr=psnr,
            ssim=ssim_value,
            payload_capacity_bytes=len(secret_text.encode('utf-8')),
            embedding_time_ms=np.mean(embed_times),
            extraction_time_ms=np.mean(extract_times),
            file_size_before=len(image_bytes),
            file_size_after=len(stego_bytes)
        )
    
    def calculate_psnr(self, original: np.ndarray, stego: np.ndarray) -> float:
        """Calculate Peak Signal-to-Noise Ratio"""
        mse = np.mean((original.astype(float) - stego.astype(float)) ** 2)
        if mse == 0:
            return float('inf')
        max_pixel = 255.0
        psnr = 20 * np.log10(max_pixel / np.sqrt(mse))
        return psnr
    
    def calculate_ssim(self, original: np.ndarray, stego: np.ndarray) -> float:
        """Calculate Structural Similarity Index"""
        if len(original.shape) == 3:
            return ssim(original, stego, multichannel=True, channel_axis=2, data_range=255)
        return ssim(original, stego, data_range=255)
    
    def calculate_capacity(self, image_width: int, image_height: int, channels: int = 3) -> int:
        """Calculate maximum payload capacity for an image in bytes"""
        # LSB steganography: 1 bit per pixel channel
        # Subtract header size (13 bytes header + 4 bytes length = 136 bits = 17 bytes)
        total_bits = image_width * image_height * channels
        usable_bits = total_bits - 136  # Header and length
        return usable_bits // 8
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get current system performance stats"""
        import psutil
        
        return {
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory_percent': psutil.virtual_memory().percent,
            'disk_usage': psutil.disk_usage('/').percent,
            'network_io': {
                'bytes_sent': psutil.net_io_counters().bytes_sent,
                'bytes_recv': psutil.net_io_counters().bytes_recv
            }
        }
    
    def generate_report(self, metrics: EncryptionMetrics or StegoMetrics) -> Dict[str, Any]:
        """Generate a formatted performance report"""
        if isinstance(metrics, EncryptionMetrics):
            return {
                'type': 'encryption',
                'encryption_time_ms': round(metrics.encryption_time_ms, 2),
                'decryption_time_ms': round(metrics.decryption_time_ms, 2),
                'throughput_mbps': round(
                    (metrics.payload_size_bytes * 8) / (metrics.encryption_time_ms * 1000), 2
                ),
                'size_overhead_percent': round(
                    ((metrics.encrypted_size_bytes - metrics.original_size_bytes) / 
                     metrics.original_size_bytes * 100), 2
                ) if metrics.original_size_bytes > 0 else 0
            }
        elif isinstance(metrics, StegoMetrics):
            return {
                'type': 'steganography',
                'psnr_db': round(metrics.psnr, 2),
                'ssim_score': round(metrics.ssim, 4),
                'embedding_time_ms': round(metrics.embedding_time_ms, 2),
                'extraction_time_ms': round(metrics.extraction_time_ms, 2),
                'payload_capacity_bytes': metrics.payload_capacity_bytes,
                'size_overhead_bytes': metrics.file_size_after - metrics.file_size_before,
                'quality_rating': self._get_quality_rating(metrics.psnr, metrics.ssim)
            }
        return {}
    
    def _get_quality_rating(self, psnr: float, ssim: float) -> str:
        """Get quality rating based on PSNR and SSIM"""
        if psnr > 40 and ssim > 0.95:
            return "Excellent"
        elif psnr > 35 and ssim > 0.90:
            return "Very Good"
        elif psnr > 30 and ssim > 0.85:
            return "Good"
        elif psnr > 25 and ssim > 0.70:
            return "Fair"
        else:
            return "Poor"

# Singleton instance
analyzer = PerformanceAnalyzer()

def get_analyzer():
    return analyzer
