const notificationModel = require('../models/notification.model');
const { STATUS_LABELS } = require('../config/constants');

const statusMessage = {
  verified: 'has been verified by the barangay',
  assigned: 'has been assigned to a field officer',
  in_progress: 'is now being worked on',
  resolved: 'has been marked resolved',
  closed: 'has been closed',
  pending: 'is back in the queue',
};

const notifyStatusChange = (report, status) =>
  notificationModel.create({
    userId: report.user_id,
    type: 'report_status',
    title: `Your report ${STATUS_LABELS[status].toLowerCase()}`,
    body: `${report.reference_no} (${report.title}) ${statusMessage[status] || 'was updated'}.`,
    link: `/reports/${report.id}`,
  });

const notifyAssignment = (report, staffId) =>
  notificationModel.create({
    userId: staffId,
    type: 'assignment',
    title: 'New assignment',
    body: `${report.reference_no} (${report.title}) has been assigned to you.`,
    link: '/staff/tasks',
  });

const notifyClaim = (item, claimerName) =>
  notificationModel.create({
    userId: item.user_id,
    type: 'lost_found',
    title: 'Someone claimed your post',
    body: `${claimerName} claimed "${item.title}". Check the item page for their contact details.`,
    link: `/lost-found`,
  });

const notifyComment = (announcement, commenterName) =>
  announcement.author_id
    ? notificationModel.create({
      userId: announcement.author_id,
      type: 'comment',
      title: 'New comment on your announcement',
      body: `${commenterName} commented on "${announcement.title}".`,
      link: '/feed',
    })
    : Promise.resolve();

const notifyCommunityComment = (post, commenterName) =>
  post.user_id
    ? notificationModel.create({
      userId: post.user_id,
      type: 'comment',
      title: 'New activity on your community post',
      body: `${commenterName} commented on your post.`,
      link: '/community',
    })
    : Promise.resolve();

module.exports = {
  notifyStatusChange, notifyAssignment, notifyClaim, notifyComment, notifyCommunityComment,
};
