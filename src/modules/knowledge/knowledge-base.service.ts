import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBaseArticle } from './knowledge-base.entity';

@Injectable()
export class KnowledgeBaseService {
  constructor(
    @InjectRepository(KnowledgeBaseArticle)
    private articleRepository: Repository<KnowledgeBaseArticle>,
  ) {}

  async findArticles(search?: string, category?: string) {
    const query = this.articleRepository.createQueryBuilder('article');

    if (search) {
      query.where(
        '(article.title ILIKE :search OR article.content ILIKE :search OR article.tags::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (category) {
      query.andWhere('article.category = :category', { category });
    }

    return query
      .orderBy('article.helpful', 'DESC')
      .addOrderBy('article.lastUpdated', 'DESC')
      .getMany();
  }

  async markHelpful(id: string) {
    await this.articleRepository.increment({ id }, 'helpful', 1);
    return this.articleRepository.findOne({ where: { id } });
  }

  async create(articleData: Partial<KnowledgeBaseArticle>) {
    const article = this.articleRepository.create(articleData);
    return this.articleRepository.save(article);
  }

  async update(id: string, articleData: Partial<KnowledgeBaseArticle>) {
    await this.articleRepository.update(id, articleData);
    return this.articleRepository.findOne({ where: { id } });
  }
}
