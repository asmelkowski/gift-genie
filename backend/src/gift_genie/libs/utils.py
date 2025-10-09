from datetime import UTC, datetime
from functools import partial


utc_datetime_now = partial(datetime.now, tz=UTC)
