import React from 'react';
import { Inbox, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState({
  title = 'No records found',
  description = 'There are no predictions recorded in the database yet.',
  actionLabel = 'Create Prediction',
  actionTo = '/predict',
  onAction,
  icon: CustomIcon
}) {
  const IconComponent = CustomIcon || Inbox;

  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <IconComponent size={28} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>

      {actionTo && (
        <Link to={actionTo} className="btn btn-primary">
          <PlusCircle size={16} />
          {actionLabel}
        </Link>
      )}

      {onAction && !actionTo && (
        <button onClick={onAction} className="btn btn-primary">
          <PlusCircle size={16} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
