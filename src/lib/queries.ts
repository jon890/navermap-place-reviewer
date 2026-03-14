/**
 * 장소 통계 + 테마/메뉴/투표 키워드 조회
 * variables: { id: string, itemId: string, businessType: string }
 */
export const GET_VISITOR_REVIEW_STATS = /* GraphQL */ `
  query getVisitorReviewStats(
    $id: String
    $itemId: String
    $businessType: String = "place"
  ) {
    visitorReviewStats(
      input: { businessId: $id, itemId: $itemId, businessType: $businessType }
    ) {
      id
      name
      review {
        avgRating
        totalCount
        starDistribution {
          score
          count
        }
      }
      analysis {
        themes {
          code
          label
          count
        }
        menus {
          code
          label
          count
        }
        votedKeyword {
          totalCount
          details {
            displayName
            count
          }
        }
      }
      visitorReviewsTotal
      ratingReviewsTotal
    }
  }
`;

/**
 * 방문자 리뷰 목록 조회 (페이지네이션 지원)
 * variables: { input: VisitorReviewsInput }
 */
export const GET_VISITOR_REVIEWS = /* GraphQL */ `
  query getVisitorReviews($input: VisitorReviewsInput) {
    visitorReviews(input: $input) {
      items {
        cursor
        rating
        body
        author {
          nickname
        }
        visited
        votedKeywords {
          name
        }
      }
      total
    }
  }
`;
