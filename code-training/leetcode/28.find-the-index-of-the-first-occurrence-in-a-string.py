#
# @lc app=leetcode.cn id=28 lang=python3
# @lcpr version=30204
#
# [28] 找出字符串中第一个匹配项的下标
#


# @lcpr-template-start

# @lcpr-template-end
# @lc code=start
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        length = len(haystack)
        window = len(needle)
        if length == 0 or length<window :
            return -1
        for left in range(0,length-window+1):
            if needle == haystack[left:left+window]:
                return left
        return -1
# @lc code=end



#
# @lcpr case=start
# "sadbutsad"\n"sad"\n
# @lcpr case=end

# @lcpr case=start
# "leetcode"\n"leeto"\n
# @lcpr case=end

#

