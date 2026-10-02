import json
import logging
import traceback
from datetime import datetime, timezone
from pathlib import Path

from .config import settings

MAX_LOG_LINES = 100


class JsonFormatter(logging.Formatter):
    """Format log records as structured JSON."""
    def format(self, record: logging.LogRecord) -> str:
        """Convert a log record into one JSON object."""
        log_record = {
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "process": record.process,
            "thread": record.thread,
        }

        if record.exc_info:
            log_record["exception"] = "".join(
                traceback.format_exception(*record.exc_info)
            )

        return json.dumps(log_record, ensure_ascii=False)


class AppLogger:
    """Configure and expose the application logger."""
    def __init__(self) -> None:
        """Initialize the application logger and its handlers."""
        # Setup logger
        self.logger = logging.getLogger("service_logger")
        self.logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.WARNING))

        self.logger.propagate = False

        if not self.logger.handlers:
            formatter = JsonFormatter()

            # Console handler
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            self.logger.addHandler(console_handler)

            # File handler — capped at MAX_LOG_LINES entries; oldest trimmed when exceeded
            _log_dir = Path(__file__).resolve().parents[2] / ".logs" / "logs"
            _log_dir.mkdir(parents=True, exist_ok=True)

            file_handler = logging.FileHandler(
                str(_log_dir / "app.log"),
                mode="a",
                encoding="utf-8",
            )
            file_handler.setFormatter(formatter)
            self._setup_capped_handler(file_handler)
            self.logger.addHandler(file_handler)


    def _setup_capped_handler(self, file_handler: logging.FileHandler) -> None:
        """Wrap the file handler so only the latest MAX_LOG_LINES entries remain."""
        path = Path(file_handler.baseFilename)
        if path.exists():
            try:
                file_handler._line_count = sum( 1 for _ in path.open(encoding="utf-8"))
            except Exception:
                file_handler._line_count = 0
        else:
            file_handler._line_count = 0

        original_emit = file_handler.emit

        def capped_emit(record: logging.LogRecord) -> None:
            """Write a log record and trim old entries when the limit is exceeded."""
            original_emit(record)
            file_handler._line_count += 1

            if file_handler._line_count > MAX_LOG_LINES:
                self._trim_log_file(file_handler)

        file_handler.emit = capped_emit

    def _trim_log_file(self, file_handler: logging.FileHandler) -> None:
        """Keep only the latest MAX_LOG_LINES log entries."""
        try:
            file_handler.stream.flush()
            file_handler.stream.close()

            path = Path(file_handler.baseFilename)

            lines = path.read_text( encoding="utf-8").splitlines(keepends=True)
            keep = lines[-MAX_LOG_LINES:]
            path.write_text("".join(keep), encoding="utf-8")

            file_handler._line_count = len(keep)
            file_handler.stream = file_handler._open()
        except Exception:
            pass

    def get_logger(self) -> logging.Logger:
        """Return the configured application logger."""
        return self.logger


logger = AppLogger().get_logger()