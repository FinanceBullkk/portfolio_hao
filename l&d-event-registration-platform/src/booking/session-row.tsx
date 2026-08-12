import { dayHeader } from './booking-utils';
import { minToHHmm, type Slot } from '../lib/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function railParts(date: string) {
  const { abbr, label } = dayHeader(date);
  const [day, mm] = label.split('/');
  return { dow: abbr, day, mon: MONTHS[parseInt(mm, 10) - 1] };
}

export function SessionRow({
  slot,
  isNext = false,
  countdown = 0,
}: {
  slot: Slot;
  isNext?: boolean;
  countdown?: number;
}) {
  const isSp = slot.type === 'Speaking';
  const { dow, day, mon } = railParts(slot.date);

  return (
    <div className={`r-sess ${isSp ? 'sp' : 'sk'}`}>
      <div className="r-rail">
        <div className="dow">{dow}</div>
        <div className="num">{day}</div>
        <div className="mon">{mon}</div>
      </div>
      <div className="r-body">
        <div className="r-body-top">
          <span className="r-type">{isSp ? 'Speaking' : '3 Skills'}</span>
          <span className="r-dur">· {isSp ? '60' : '150'} min</span>
          {isNext && countdown > 0 && (
            <span className="r-next"><span className="d">{countdown} days left</span></span>
          )}
        </div>
        <div className="r-time">
          {minToHHmm(slot.startMin)}<span className="dash">-</span>{minToHHmm(slot.endMin)}
        </div>
        {slot.location && <div className="r-where">{slot.location}</div>}
      </div>
    </div>
  );
}

export function DeletedSlotRow({ label, slotId }: { label: string; slotId: string }) {
  return (
    <div className="bk-slot">
      <div className="num" style={{ background: 'var(--danger-50)', color: 'var(--danger-600)' }}>!</div>
      <div className="body">
        <div className="type-lbl" style={{ color: 'var(--danger-600)' }}>{label}</div>
        <div className="when" style={{ color: 'var(--danger-600)', fontSize: 'var(--fs-sm)' }}>
          {slotId} - slot deleted, contact the organizers
        </div>
      </div>
    </div>
  );
}
