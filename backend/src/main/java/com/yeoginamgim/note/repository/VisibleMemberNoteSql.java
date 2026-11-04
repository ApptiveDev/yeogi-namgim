package com.yeoginamgim.note.repository;

/** Shared SQL predicate for member note lists that must filter before pagination. */
public final class VisibleMemberNoteSql {
	public static final String CURRENT_FRIEND = """
		EXISTS (SELECT 1 FROM app.friendships f
		 WHERE (f.user_low = :userId AND f.user_high = n.author_user_id)
		    OR (f.user_high = :userId AND f.user_low = n.author_user_id))
		""";
	public static final String VISIBLE = "(n.author_user_id = :userId OR n.visibility = 'PUBLIC' OR "
		+ "(n.visibility = 'FRIENDS' AND " + CURRENT_FRIEND + "))";

	private VisibleMemberNoteSql() {}
}
